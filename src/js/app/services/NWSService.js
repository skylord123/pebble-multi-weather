/**
 * NWSService - National Weather Service (weather.gov) API implementation
 *
 * Uses the NWS API to fetch weather data.
 * API workflow:
 * 1. Call /points/{lat},{lon} to get forecast URLs and nearest station
 * 2. Fetch current conditions from observation station
 * 3. Fetch forecast for high/low temperatures
 */

var ajax = require('lib/ajax');
var WeatherService = require('app/services/WeatherService');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

class NWSService extends WeatherService {
    constructor() {
        super(Constants.providers.nws);
        this.pointsCache = null;
    }

    /**
     * Make an API request to NWS
     * @private
     */
    _request(url, onSuccess, onError) {
        var log = helpers.log;
        log('NWS Request: ' + url);

        ajax({
            url: url,
            type: 'json',
            headers: {
                'User-Agent': Constants.userAgent,
                'Accept': 'application/geo+json'
            }
        },
        function(data, status) {
            log('NWS Response status: ' + status);
            onSuccess(data);
        },
        function(error, status) {
            log('NWS Error: ' + status + ' - ' + JSON.stringify(error));
            onError(error, status);
        });
    }

    /**
     * Get metadata for a location (forecast URLs, station info)
     * @private
     */
    _getPointsData(latitude, longitude, onSuccess, onError) {
        var self = this;
        var log = helpers.log;
        var url = this.baseUrl + '/points/' + latitude.toFixed(4) + ',' + longitude.toFixed(4);

        this._request(url, function(data) {
            // Check for error response (e.g., InvalidPoint for non-USA locations)
            if (data && data.type && data.type.indexOf('problems') !== -1) {
                log('NWS: API returned error - ' + data.title);
                onError({
                    isApiError: true,
                    type: data.type,
                    title: data.title || 'Data Unavailable',
                    detail: data.detail || 'Unable to provide data for this location',
                    status: data.status
                });
                return;
            }

            if (data && data.properties) {
                self.pointsCache = data.properties;
                onSuccess(data.properties);
            } else {
                onError('Invalid points response');
            }
        }, function(errorData, status) {
            // Handle HTTP error responses
            log('NWS: HTTP error - status ' + status);
            if (errorData && typeof errorData === 'object' && errorData.title) {
                onError({
                    isApiError: true,
                    type: errorData.type || 'unknown',
                    title: errorData.title || 'Error',
                    detail: errorData.detail || 'An error occurred',
                    status: status
                });
            } else {
                onError('Request failed: ' + status);
            }
        });
    }

    /**
     * Get current observation from the nearest station
     * @private
     */
    _getCurrentObservation(stationsUrl, onSuccess, onError) {
        var self = this;

        // First get the list of stations
        this._request(stationsUrl, function(stationsData) {
            if (!stationsData.features || stationsData.features.length === 0) {
                onError('No observation stations found');
                return;
            }

            // Get the first (closest) station
            var stationId = stationsData.features[0].properties.stationIdentifier;
            var observationUrl = Constants.providers.nws.baseUrl +
                '/stations/' + stationId + '/observations/latest';

            self._request(observationUrl, function(obsData) {
                if (obsData && obsData.properties) {
                    onSuccess(obsData.properties);
                } else {
                    onError('Invalid observation response');
                }
            }, onError);
        }, onError);
    }

    /**
     * Get forecast data
     * @private
     */
    _getForecast(forecastUrl, onSuccess, onError) {
        this._request(forecastUrl, function(data) {
            if (data && data.properties && data.properties.periods) {
                onSuccess(data.properties.periods);
            } else {
                onError('Invalid forecast response');
            }
        }, onError);
    }

    /**
     * Get hourly forecast data
     * @private
     */
    _getHourlyForecast(forecastUrl, onSuccess, onError) {
        this._request(forecastUrl, function(data) {
            if (data && data.properties && data.properties.periods) {
                onSuccess(data.properties);
            } else {
                onError('Invalid hourly forecast response');
            }
        }, onError);
    }

    /**
     * Extract high/low temperatures from forecast periods
     * Uses the first daytime period for high and first nighttime period for low
     * @private
     */
    _extractHighLow(periods) {
        var high = null;
        var low = null;

        // Use only the first daytime period for high and first nighttime period for low
        for (var i = 0; i < Math.min(periods.length, 4); i++) {
            var period = periods[i];
            var temp = period.temperature;

            if (period.isDaytime && high === null) {
                high = temp;
            } else if (!period.isDaytime && low === null) {
                low = temp;
            }

            // Stop once we have both
            if (high !== null && low !== null) {
                break;
            }
        }

        // Fallback if we only got one type
        if (high === null && periods.length > 0) {
            high = periods[0].temperature;
        }
        if (low === null && periods.length > 1) {
            low = periods[1].temperature;
        }

        return { high: high, low: low };
    }

    /**
     * Fetch weather data for the given coordinates
     *
     * @param {number} latitude
     * @param {number} longitude
     * @param {Function} onSuccess - Callback with weather data object
     * @param {Function} onError - Callback with error message
     */
    fetchWeather(latitude, longitude, onSuccess, onError) {
        var self = this;
        var log = helpers.log;

        log('NWS: Fetching weather for ' + latitude + ', ' + longitude);

        // Step 1: Get points data for this location
        this._getPointsData(latitude, longitude, function(pointsData) {
            var weatherData = {
                provider: self.id,
                location: pointsData.relativeLocation ?
                    pointsData.relativeLocation.properties.city + ', ' +
                    pointsData.relativeLocation.properties.state : 'Unknown',
                currentTemp: null,
                highTemp: null,
                lowTemp: null,
                conditions: null,
                humidity: null,
                windSpeed: null,
                windDirection: null,
                barometer: null,
                dewpoint: null,
                visibility: null,
                observationTime: null,
                forecastPeriods: null,
                hourlyForecast: null,
                currentIconUrl: null,
                timestamp: Date.now()
            };

            var completed = { observation: false, forecast: false, hourly: false };
            var hasError = false;

            function checkComplete() {
                if (completed.observation && completed.forecast && completed.hourly && !hasError) {
                    log('NWS: Weather data complete');
                    onSuccess(weatherData);
                }
            }

            // Step 2: Get current observation
            var stationsUrl = pointsData.observationStations;
            self._getCurrentObservation(stationsUrl, function(obs) {
                // Temperature is in Celsius from the API
                if (obs.temperature && obs.temperature.value !== null) {
                    weatherData.currentTemp = helpers.celsiusToFahrenheit(obs.temperature.value);
                }
                if (obs.textDescription) {
                    weatherData.conditions = obs.textDescription;
                }
                if (obs.relativeHumidity && obs.relativeHumidity.value !== null) {
                    weatherData.humidity = Math.round(obs.relativeHumidity.value);
                }
                if (obs.windSpeed && obs.windSpeed.value !== null) {
                    // Convert km/h to mph
                    weatherData.windSpeed = Math.round(obs.windSpeed.value * 0.621371);
                }
                if (obs.windDirection && obs.windDirection.value !== null) {
                    weatherData.windDirection = self._degreesToCompass(obs.windDirection.value);
                }
                // Barometric pressure (in Pascals) - try barometricPressure first, then seaLevelPressure
                if (obs.barometricPressure && obs.barometricPressure.value !== null) {
                    weatherData.barometer = obs.barometricPressure.value;
                } else if (obs.seaLevelPressure && obs.seaLevelPressure.value !== null) {
                    weatherData.barometer = obs.seaLevelPressure.value;
                }
                // Dewpoint (in Celsius, convert to Fahrenheit)
                if (obs.dewpoint && obs.dewpoint.value !== null) {
                    weatherData.dewpoint = helpers.celsiusToFahrenheit(obs.dewpoint.value);
                }
                // Visibility (in meters)
                if (obs.visibility && obs.visibility.value !== null) {
                    weatherData.visibility = obs.visibility.value;
                }
                // Observation timestamp
                if (obs.timestamp) {
                    weatherData.observationTime = obs.timestamp;
                }

                completed.observation = true;
                checkComplete();
            }, function(err) {
                log('NWS: Observation error - ' + err);
                // Continue without observation data
                completed.observation = true;
                checkComplete();
            });

            // Step 3: Get forecast for high/low and detailed periods
            var forecastUrl = pointsData.forecast;
            self._getForecast(forecastUrl, function(periods) {
                var highLow = self._extractHighLow(periods);
                weatherData.highTemp = highLow.high;
                weatherData.lowTemp = highLow.low;

                // Store all forecast periods for detailed forecast view
                weatherData.forecastPeriods = periods;
                if (periods.length > 0 && periods[0].icon) {
                    weatherData.currentIconUrl = periods[0].icon;
                }

                // If we don't have current conditions from observation,
                // use the forecast description
                if (!weatherData.conditions && periods.length > 0) {
                    weatherData.conditions = periods[0].shortForecast;
                }

                completed.forecast = true;
                checkComplete();
            }, function(err) {
                log('NWS: Forecast error - ' + err);
                // Continue without forecast data
                completed.forecast = true;
                checkComplete();
            });

            // Step 4: Get hourly forecast data (for hourly graphs)
            var hourlyUrl = pointsData.forecastHourly;
            if (hourlyUrl) {
                self._getHourlyForecast(hourlyUrl, function(hourlyData) {
                    weatherData.hourlyForecast = hourlyData;
                    if (hourlyData && hourlyData.periods && hourlyData.periods.length > 0 && hourlyData.periods[0].icon) {
                        weatherData.currentIconUrl = hourlyData.periods[0].icon;
                    }
                    completed.hourly = true;
                    checkComplete();
                }, function(err) {
                    log('NWS: Hourly forecast error - ' + err);
                    completed.hourly = true;
                    checkComplete();
                });
            } else {
                completed.hourly = true;
                checkComplete();
            }

        }, function(err) {
            log('NWS: Points error - ' + (err.title || err));
            // Pass through API error details if available
            if (err && err.isApiError) {
                onError(err);
            } else {
                onError('Failed to get location data: ' + err);
            }
        });
    }

    /**
     * Convert degrees to compass direction
     * @private
     */
    _degreesToCompass(degrees) {
        var directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        var index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
}

module.exports = NWSService;
