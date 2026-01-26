/**
 * WeatherAPIService - WeatherAPI.com implementation
 * Free plan: 1 million calls/month, current weather + 3-day forecast
 */

var ajax = require('lib/ajax');
var WeatherService = require('app/services/WeatherService');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var Settings = require('settings');

class WeatherAPIService extends WeatherService {
    constructor() {
        super(Constants.providers.weatherapi);
    }

    _request(url, onSuccess, onError) {
        var log = helpers.log;
        log('WeatherAPI Request: ' + url);

        ajax({
            url: url,
            type: 'json'
        }, function(data, status) {
            log('WeatherAPI Response status: ' + status);
            onSuccess(data);
        }, function(error, status) {
            log('WeatherAPI Error: ' + status + ' - ' + JSON.stringify(error));
            onError(error, status);
        });
    }

    _getApiKey() {
        return Settings.option('weatherapi_api_key') || '';
    }

    _buildUrl(latitude, longitude) {
        var apiKey = this._getApiKey();

        // Use forecast endpoint to get current + forecast data
        // Request max days (14) - API returns what user's plan allows
        // Free plan: 3 days, paid plans: up to 14 days
        var params = [
            'key=' + apiKey,
            'q=' + latitude.toFixed(4) + ',' + longitude.toFixed(4),
            'days=14',
            'aqi=no',
            'alerts=no'
        ];

        return this.baseUrl + '/forecast.json?' + params.join('&');
    }

    fetchWeather(latitude, longitude, onSuccess, onError) {
        var self = this;
        var log = helpers.log;

        // Check for API key
        var apiKey = this._getApiKey();
        if (!apiKey) {
            var err = {
                isApiError: true,
                type: 'MissingApiKey',
                title: 'API Key Required',
                detail: 'Please configure your WeatherAPI.com API key in the mobile app settings.'
            };
            onError(err);
            return;
        }

        var url = this._buildUrl(latitude, longitude);

        log('WeatherAPI: Fetching weather for ' + latitude + ', ' + longitude);

        this._request(url, function(data) {
            // Check for API errors
            if (data && data.error) {
                var apiErr = {
                    isApiError: true,
                    type: 'ApiError',
                    title: 'API Error',
                    detail: data.error.message || 'Unknown error'
                };
                onError(apiErr);
                return;
            }

            if (!data || !data.current) {
                onError('Invalid WeatherAPI response');
                return;
            }

            var current = data.current;
            var location = data.location;
            var forecast = data.forecast && data.forecast.forecastday ? data.forecast.forecastday : [];

            // Get today's forecast for high/low temps
            var todayForecast = forecast.length > 0 ? forecast[0] : null;

            log('WeatherAPI: Received ' + forecast.length + ' forecast days from API');
            log('WeatherAPI: current.condition.code = ' + (current.condition ? current.condition.code : 'N/A'));
            log('WeatherAPI: current.condition.text = ' + (current.condition ? current.condition.text : 'N/A'));

            var weatherData = {
                provider: self.id,
                location: location ? (location.name + ', ' + location.region) : 'WeatherAPI',
                currentTemp: current.temp_f,
                highTemp: todayForecast && todayForecast.day ? todayForecast.day.maxtemp_f : null,
                lowTemp: todayForecast && todayForecast.day ? todayForecast.day.mintemp_f : null,
                conditions: current.condition ? current.condition.text : 'Unknown',
                currentWeatherCode: current.condition ? current.condition.code : null,
                humidity: current.humidity,
                windSpeed: current.wind_mph,
                windDirection: self._degreesToCompass(current.wind_degree),
                barometer: current.pressure_mb ? current.pressure_mb * 100 : null, // mbar to Pa
                dewpoint: current.dewpoint_f,
                visibility: current.vis_miles ? current.vis_miles * 1609.34 : null, // miles to meters
                observationTime: current.last_updated_epoch ? current.last_updated_epoch * 1000 : Date.now(),
                isDay: current.is_day === 1,
                forecastPeriods: self._buildDailyForecast(forecast),
                hourlyForecast: {
                    periods: self._buildHourlyPeriods(forecast)
                },
                timestamp: Date.now()
            };

            log('WeatherAPI: Built ' + weatherData.forecastPeriods.length + ' daily forecast periods');
            log('WeatherAPI: Built ' + weatherData.hourlyForecast.periods.length + ' hourly forecast periods');

            onSuccess(weatherData);
        }, function(err, status) {
            log('WeatherAPI: Request error - ' + err + ' (status: ' + status + ')');

            // Handle specific error codes
            if (status === 401 || status === 403) {
                var authErr = {
                    isApiError: true,
                    type: 'InvalidApiKey',
                    title: 'Invalid API Key',
                    detail: 'Your WeatherAPI.com API key is invalid. Please check your settings.'
                };
                onError(authErr);
                return;
            }

            if (status === 429) {
                var rateErr = {
                    isApiError: true,
                    type: 'RateLimited',
                    title: 'Rate Limited',
                    detail: 'Too many API requests. Please try again later.'
                };
                onError(rateErr);
                return;
            }

            onError(err);
        });
    }

    _buildHourlyPeriods(forecastDays) {
        var periods = [];
        if (!forecastDays || !forecastDays.length) {
            return periods;
        }

        // Get current time to filter out past hours
        var now = Date.now();
        var periodNum = 1;

        // Collect hourly data from all forecast days, filtering to current hour onwards
        for (var d = 0; d < forecastDays.length; d++) {
            var day = forecastDays[d];
            if (!day.hour || !day.hour.length) continue;

            for (var h = 0; h < day.hour.length; h++) {
                var hour = day.hour[h];
                var startTime = hour.time_epoch ? hour.time_epoch * 1000 : null;

                // Skip past hours - only include hours from current hour onwards
                if (!startTime || startTime < now - 3600000) {
                    continue;
                }

                // Limit to 48 hours of data (matching other providers)
                if (periodNum > 48) {
                    break;
                }

                var endTime = startTime + 60 * 60 * 1000;

                periods.push({
                    number: periodNum++,
                    name: '',
                    startTime: startTime,
                    endTime: endTime,
                    isDaytime: hour.is_day === 1,
                    temperature: hour.temp_f,
                    temperatureUnit: null,
                    temperatureTrend: null,
                    probabilityOfPrecipitation: {
                        unitCode: 'wmoUnit:percent',
                        value: hour.chance_of_rain || 0
                    },
                    dewpoint: {
                        unitCode: null,
                        value: hour.dewpoint_f
                    },
                    relativeHumidity: {
                        unitCode: 'wmoUnit:percent',
                        value: hour.humidity
                    },
                    windSpeed: hour.wind_mph,
                    windDirection: this._degreesToCompass(hour.wind_degree),
                    icon: null,
                    weatherCode: hour.condition ? hour.condition.code : null,
                    shortForecast: hour.condition ? hour.condition.text : '',
                    detailedForecast: ''
                });
            }

            // Stop if we've collected enough hours
            if (periodNum > 48) {
                break;
            }
        }

        return periods;
    }

    _buildDailyForecast(forecastDays) {
        var periods = [];
        if (!forecastDays || !forecastDays.length) {
            return periods;
        }

        for (var i = 0; i < forecastDays.length; i++) {
            var day = forecastDays[i];
            var dayData = day.day;
            var startTime = day.date_epoch ? day.date_epoch * 1000 : null;
            var endTime = startTime ? startTime + 24 * 60 * 60 * 1000 : null;

            periods.push({
                number: i + 1,
                name: this._formatDayName(startTime, i),
                startTime: startTime,
                endTime: endTime,
                isDaytime: true,
                temperature: dayData ? dayData.maxtemp_f : null,
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: dayData ? dayData.daily_chance_of_rain : 0
                },
                windSpeed: dayData ? Math.round(dayData.maxwind_mph) + ' mph' : null,
                windDirection: null,
                icon: null,
                weatherCode: dayData && dayData.condition ? dayData.condition.code : null,
                shortForecast: dayData && dayData.condition ? dayData.condition.text : '',
                detailedForecast: dayData && dayData.condition ? dayData.condition.text : ''
            });
        }

        return periods;
    }

    _formatDayName(startTime, index) {
        if (!startTime) {
            return 'Day ' + (index + 1);
        }
        var date = new Date(startTime);
        if (isNaN(date.getTime())) {
            return 'Day ' + (index + 1);
        }
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (index === 0) {
            return 'Today';
        }
        return days[date.getDay()];
    }

    _degreesToCompass(degrees) {
        if (degrees === null || degrees === undefined || isNaN(degrees)) {
            return null;
        }
        var directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        var index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
}

module.exports = WeatherAPIService;
