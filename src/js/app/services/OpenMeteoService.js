/**
 * OpenMeteoService - Open-Meteo API implementation
 */

var ajax = require('lib/ajax');
var WeatherService = require('app/services/WeatherService');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

class OpenMeteoService extends WeatherService {
    constructor() {
        super(Constants.providers.openmeteo);
    }

    _request(url, onSuccess, onError) {
        var log = helpers.log;
        log('Open-Meteo Request: ' + url);

        ajax({
            url: url,
            type: 'json'
        }, function(data, status) {
            log('Open-Meteo Response status: ' + status);
            onSuccess(data);
        }, function(error, status) {
            log('Open-Meteo Error: ' + status + ' - ' + JSON.stringify(error));
            onError(error, status);
        });
    }

    _buildUrl(latitude, longitude) {
        var temperatureUnitParam = 'fahrenheit';

        // Current weather variables (uses newer 'current' API)
        var currentVars = [
            'temperature_2m',
            'relative_humidity_2m',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
            'surface_pressure',
            'is_day'
        ];

        var hourlyVars = [
            'temperature_2m',
            'relative_humidity_2m',
            'dew_point_2m',
            'pressure_msl',
            'visibility',
            'wind_speed_10m',
            'wind_direction_10m',
            'precipitation_probability',
            'weather_code'
        ];

        var dailyVars = [
            'temperature_2m_max',
            'temperature_2m_min',
            'weather_code',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_direction_10m_dominant'
        ];

        var params = [
            'latitude=' + latitude.toFixed(4),
            'longitude=' + longitude.toFixed(4),
            'current=' + currentVars.join(','),
            'hourly=' + hourlyVars.join(','),
            'daily=' + dailyVars.join(','),
            'forecast_days=7',
            'timezone=auto',
            'temperature_unit=' + temperatureUnitParam,
            'windspeed_unit=mph'
        ];

        return this.baseUrl + '/v1/forecast?' + params.join('&');
    }

    fetchWeather(latitude, longitude, onSuccess, onError) {
        var self = this;
        var log = helpers.log;
        var url = this._buildUrl(latitude, longitude);

        log('Open-Meteo: Fetching weather for ' + latitude + ', ' + longitude);

        this._request(url, function(data) {
            if (data && data.error) {
                onError(data.reason || 'Open-Meteo error');
                return;
            }

            if (!data || !data.hourly || !data.daily) {
                onError('Invalid Open-Meteo response');
                return;
            }

            var hourly = data.hourly;
            var daily = data.daily;
            // Use new 'current' API (properties use underscores: weather_code, wind_speed_10m, etc.)
            var current = data.current || {};

            // Find current hour index for hourly fallback
            var currentHourIndex = self._findHourlyStartIndex(hourly, current.time);

            // Log weather codes for debugging
            var currentWeatherCode = (current.weather_code !== undefined && current.weather_code !== null)
                ? current.weather_code
                : current.weathercode;
            var hourlyWeatherCodeSeries = hourly.weather_code || hourly.weathercode;
            var dailyWeatherCodeSeries = daily.weather_code || daily.weathercode;

            log('Open-Meteo: current.weather_code = ' + currentWeatherCode);
            log('Open-Meteo: hourly.weather_code[' + currentHourIndex + '] = ' +
                (hourlyWeatherCodeSeries ? hourlyWeatherCodeSeries[currentHourIndex] : 'N/A'));
            log('Open-Meteo: daily.weather_code[0] = ' +
                (dailyWeatherCodeSeries ? dailyWeatherCodeSeries[0] : 'N/A'));
            log('Open-Meteo: Full current object: ' + JSON.stringify(current));

            var weatherData = {
                provider: self.id,
                location: data.timezone_abbreviation || data.timezone || 'Open-Meteo',
                currentTemp: self._pickValue(current.temperature_2m, hourly.temperature_2m, currentHourIndex),
                highTemp: self._pickValue(null, daily.temperature_2m_max, 0),
                lowTemp: self._pickValue(null, daily.temperature_2m_min, 0),
                conditions: self._weatherCodeToText(self._pickValue(currentWeatherCode, hourlyWeatherCodeSeries, currentHourIndex)),
                currentWeatherCode: self._pickValue(currentWeatherCode, hourlyWeatherCodeSeries, currentHourIndex),
                humidity: self._roundValue(self._pickValue(current.relative_humidity_2m, hourly.relative_humidity_2m, currentHourIndex)),
                windSpeed: self._pickValue(current.wind_speed_10m, hourly.wind_speed_10m, currentHourIndex),
                windDirection: self._degreesToCompass(self._pickValue(current.wind_direction_10m, hourly.wind_direction_10m, currentHourIndex)),
                barometer: self._pressureToPascals(self._pickValue(current.surface_pressure, hourly.pressure_msl, currentHourIndex)),
                dewpoint: self._pickValue(null, hourly.dew_point_2m, currentHourIndex),
                visibility: self._pickValue(null, hourly.visibility, currentHourIndex),
                observationTime: self._parseTime(current.time || (hourly.time && hourly.time[currentHourIndex])),
                isDay: current.is_day,
                forecastPeriods: self._buildDailyForecast(daily),
                hourlyForecast: {
                    periods: self._buildHourlyPeriods(hourly, current.time)
                },
                timestamp: Date.now()
            };

            onSuccess(weatherData);
        }, function(err) {
            log('Open-Meteo: Request error - ' + err);
            onError(err);
        });
    }

    _buildHourlyPeriods(hourly, currentTime) {
        var periods = [];
        if (!hourly || !hourly.time) {
            return periods;
        }
        var weatherCodeSeries = hourly.weather_code || hourly.weathercode;

        // Find the starting index for the current hour
        var startIndex = this._findHourlyStartIndex(hourly, currentTime);

        var count = hourly.time.length;
        for (var i = startIndex; i < count; i++) {
            var startTime = this._parseTime(hourly.time[i]);
            var endTime = (i + 1 < count)
                ? this._parseTime(hourly.time[i + 1])
                : (startTime ? startTime + 60 * 60 * 1000 : null);

            periods.push({
                number: periods.length + 1,
                name: '',
                startTime: startTime,
                endTime: endTime,
                isDaytime: null,
                temperature: this._pickValue(null, hourly.temperature_2m, i),
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: this._pickValue(null, hourly.precipitation_probability, i)
                },
                dewpoint: {
                    unitCode: null,
                    value: this._pickValue(null, hourly.dew_point_2m, i)
                },
                relativeHumidity: {
                    unitCode: 'wmoUnit:percent',
                    value: this._pickValue(null, hourly.relative_humidity_2m, i)
                },
                windSpeed: this._pickValue(null, hourly.wind_speed_10m, i),
                windDirection: this._degreesToCompass(this._pickValue(null, hourly.wind_direction_10m, i)),
                icon: null,
                weatherCode: this._pickValue(null, weatherCodeSeries, i),
                shortForecast: this._weatherCodeToText(this._pickValue(null, weatherCodeSeries, i)),
                detailedForecast: ''
            });
        }

        return periods;
    }

    _buildDailyForecast(daily) {
        var periods = [];
        if (!daily || !daily.time) {
            return periods;
        }
        var weatherCodeSeries = daily.weather_code || daily.weathercode;

        for (var i = 0; i < daily.time.length; i++) {
            var startTime = this._parseTime(daily.time[i]);
            var endTime = startTime ? startTime + 24 * 60 * 60 * 1000 : null;
            var weatherCode = this._pickValue(null, weatherCodeSeries, i);
            var windSpeed = this._pickValue(null, daily.wind_speed_10m_max, i);
            var windDir = this._pickValue(null, daily.wind_direction_10m_dominant, i);
            var precip = this._pickValue(null, daily.precipitation_probability_max, i);

            periods.push({
                number: i + 1,
                name: this._formatDayName(startTime, i),
                startTime: startTime,
                endTime: endTime,
                isDaytime: true,
                temperature: this._pickValue(null, daily.temperature_2m_max, i),
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: precip
                },
                windSpeed: (windSpeed !== null && windSpeed !== undefined) ? Math.round(windSpeed) + ' mph' : null,
                windDirection: this._degreesToCompass(windDir),
                icon: null,
                weatherCode: weatherCode,
                shortForecast: this._weatherCodeToText(weatherCode),
                detailedForecast: this._weatherCodeToText(weatherCode)
            });
        }

        return periods;
    }

    _pickValue(primary, series, index) {
        if (primary !== null && primary !== undefined && !isNaN(primary)) {
            return primary;
        }
        if (!series || !series.length || index === null || index === undefined) {
            return null;
        }
        var value = series[index];
        if (value === null || value === undefined || isNaN(value)) {
            return value === 0 ? 0 : null;
        }
        return value;
    }

    _parseTime(value) {
        if (!value) {
            return null;
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return value;
        }
        return date.getTime();
    }

    _findHourlyStartIndex(hourly, currentTime) {
        if (!hourly || !hourly.time || !hourly.time.length) {
            return 0;
        }

        if (currentTime) {
            for (var i = 0; i < hourly.time.length; i++) {
                if (hourly.time[i] === currentTime) {
                    return i;
                }
            }
        }

        var nowTime = currentTime ? this._parseTime(currentTime) : Date.now();
        for (var j = 0; j < hourly.time.length; j++) {
            var periodTime = this._parseTime(hourly.time[j]);
            if (periodTime !== null && periodTime !== undefined && periodTime >= nowTime) {
                return j;
            }
        }

        return 0;
    }

    _pressureToPascals(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return value * 100;
    }

    _roundValue(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return Math.round(value);
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

    /**
     * Convert WMO weather code to human-readable text
     * Reference: WMO Code Table 4677
     * https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c
     */
    _weatherCodeToText(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return 'Unknown';
        }
        var normalized = Number(code);

        // Clear conditions
        if (normalized === 0) return 'Clear';
        if (normalized === 1) return 'Mostly Clear';
        if (normalized === 2) return 'Partly Cloudy';
        if (normalized === 3) return 'Cloudy';

        // Fog
        if (normalized === 45) return 'Fog';
        if (normalized === 48) return 'Freezing Fog';

        // Drizzle
        if (normalized === 51) return 'Light Drizzle';
        if (normalized === 53) return 'Drizzle';
        if (normalized === 55) return 'Heavy Drizzle';
        if (normalized === 56) return 'Freezing Drizzle';
        if (normalized === 57) return 'Heavy Freezing Drizzle';

        // Rain
        if (normalized === 61) return 'Light Rain';
        if (normalized === 63) return 'Rain';
        if (normalized === 65) return 'Heavy Rain';
        if (normalized === 66) return 'Freezing Rain';
        if (normalized === 67) return 'Heavy Freezing Rain';

        // Snow
        if (normalized === 71) return 'Light Snow';
        if (normalized === 73) return 'Snow';
        if (normalized === 75) return 'Heavy Snow';
        if (normalized === 77) return 'Snow Grains';

        // Rain showers
        if (normalized === 80) return 'Light Showers';
        if (normalized === 81) return 'Showers';
        if (normalized === 82) return 'Heavy Showers';

        // Snow showers
        if (normalized === 85) return 'Light Snow Showers';
        if (normalized === 86) return 'Snow Showers';

        // Thunderstorm
        if (normalized === 95) return 'Thunderstorm';
        if (normalized === 96) return 'Thunderstorm w/ Hail';
        if (normalized === 99) return 'Severe Thunderstorm';

        return 'Unknown';
    }
}

module.exports = OpenMeteoService;
