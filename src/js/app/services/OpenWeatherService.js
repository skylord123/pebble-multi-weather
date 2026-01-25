/**
 * OpenWeatherService - OpenWeatherMap One Call API 3.0 implementation
 */

var ajax = require('lib/ajax');
var WeatherService = require('app/services/WeatherService');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var Settings = require('settings');

class OpenWeatherService extends WeatherService {
    constructor() {
        super(Constants.providers.openweather);
    }

    _request(url, onSuccess, onError) {
        var log = helpers.log;
        log('OpenWeather Request: ' + url);

        ajax({
            url: url,
            type: 'json'
        }, function(data, status) {
            log('OpenWeather Response status: ' + status);
            onSuccess(data);
        }, function(error, status) {
            log('OpenWeather Error: ' + status + ' - ' + JSON.stringify(error));
            onError(error, status);
        });
    }

    _getApiKey() {
        return Settings.option('openweather_api_key') || '';
    }

    _buildUrl(latitude, longitude) {
        var apiKey = this._getApiKey();

        var params = [
            'lat=' + latitude.toFixed(4),
            'lon=' + longitude.toFixed(4),
            'appid=' + apiKey,
            'units=imperial',  // Fahrenheit and mph
            'exclude=minutely,alerts'  // We don't need minutely or alerts data
        ];

        return this.baseUrl + '/onecall?' + params.join('&');
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
                detail: 'Please configure your OpenWeatherMap API key in the mobile app settings.'
            };
            onError(err);
            return;
        }

        var url = this._buildUrl(latitude, longitude);

        log('OpenWeather: Fetching weather for ' + latitude + ', ' + longitude);

        this._request(url, function(data) {
            // Check for API errors
            if (data && data.cod && data.cod !== 200) {
                var apiErr = {
                    isApiError: true,
                    type: 'ApiError',
                    title: 'API Error',
                    detail: data.message || 'Unknown error'
                };
                onError(apiErr);
                return;
            }

            if (!data || !data.current) {
                onError('Invalid OpenWeather response');
                return;
            }

            var current = data.current;
            var hourly = data.hourly || [];
            var daily = data.daily || [];

            // Get current weather info
            var currentWeather = current.weather && current.weather[0] ? current.weather[0] : {};

            log('OpenWeather: current.weather[0].id = ' + currentWeather.id);
            log('OpenWeather: current.weather[0].description = ' + currentWeather.description);

            var weatherData = {
                provider: self.id,
                location: data.timezone || 'OpenWeather',
                currentTemp: current.temp,
                highTemp: daily.length > 0 ? daily[0].temp.max : null,
                lowTemp: daily.length > 0 ? daily[0].temp.min : null,
                conditions: self._weatherCodeToText(currentWeather.id, currentWeather.description),
                currentWeatherCode: currentWeather.id,
                humidity: current.humidity,
                windSpeed: current.wind_speed,
                windDirection: self._degreesToCompass(current.wind_deg),
                barometer: current.pressure ? current.pressure * 100 : null, // hPa to Pa
                dewpoint: current.dew_point,
                visibility: current.visibility,
                observationTime: current.dt ? current.dt * 1000 : Date.now(),
                isDay: self._isDay(current.sunrise, current.sunset, current.dt),
                forecastPeriods: self._buildDailyForecast(daily),
                hourlyForecast: {
                    periods: self._buildHourlyPeriods(hourly)
                },
                timestamp: Date.now()
            };

            onSuccess(weatherData);
        }, function(err, status) {
            log('OpenWeather: Request error - ' + err + ' (status: ' + status + ')');

            // Handle specific error codes
            if (status === 401) {
                var authErr = {
                    isApiError: true,
                    type: 'InvalidApiKey',
                    title: 'Invalid API Key',
                    detail: 'Your OpenWeatherMap API key is invalid. Please check your settings.'
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

    _isDay(sunrise, sunset, current) {
        if (!sunrise || !sunset || !current) {
            return null;
        }
        return current >= sunrise && current < sunset;
    }

    _buildHourlyPeriods(hourly) {
        var periods = [];
        if (!hourly || !hourly.length) {
            return periods;
        }

        // Take up to 48 hours of data
        var count = Math.min(hourly.length, 48);
        for (var i = 0; i < count; i++) {
            var hour = hourly[i];
            var weather = hour.weather && hour.weather[0] ? hour.weather[0] : {};
            var startTime = hour.dt ? hour.dt * 1000 : null;
            var endTime = startTime ? startTime + 60 * 60 * 1000 : null;

            periods.push({
                number: i + 1,
                name: '',
                startTime: startTime,
                endTime: endTime,
                isDaytime: null,
                temperature: hour.temp,
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: hour.pop ? Math.round(hour.pop * 100) : 0
                },
                dewpoint: {
                    unitCode: null,
                    value: hour.dew_point
                },
                relativeHumidity: {
                    unitCode: 'wmoUnit:percent',
                    value: hour.humidity
                },
                windSpeed: hour.wind_speed,
                windDirection: this._degreesToCompass(hour.wind_deg),
                icon: null,
                weatherCode: weather.id,
                shortForecast: this._weatherCodeToText(weather.id, weather.description),
                detailedForecast: ''
            });
        }

        return periods;
    }

    _buildDailyForecast(daily) {
        var periods = [];
        if (!daily || !daily.length) {
            return periods;
        }

        for (var i = 0; i < daily.length; i++) {
            var day = daily[i];
            var weather = day.weather && day.weather[0] ? day.weather[0] : {};
            var startTime = day.dt ? day.dt * 1000 : null;
            var endTime = startTime ? startTime + 24 * 60 * 60 * 1000 : null;

            periods.push({
                number: i + 1,
                name: this._formatDayName(startTime, i),
                startTime: startTime,
                endTime: endTime,
                isDaytime: true,
                temperature: day.temp ? day.temp.max : null,
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: day.pop ? Math.round(day.pop * 100) : 0
                },
                windSpeed: day.wind_speed ? Math.round(day.wind_speed) + ' mph' : null,
                windDirection: this._degreesToCompass(day.wind_deg),
                icon: null,
                weatherCode: weather.id,
                shortForecast: this._weatherCodeToText(weather.id, weather.description),
                detailedForecast: day.summary || this._weatherCodeToText(weather.id, weather.description)
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

    /**
     * Convert OpenWeatherMap weather condition codes to human-readable text
     * Reference: https://openweathermap.org/weather-conditions
     *
     * Code ranges:
     * 2xx: Thunderstorm
     * 3xx: Drizzle
     * 5xx: Rain
     * 6xx: Snow
     * 7xx: Atmosphere (mist, fog, etc.)
     * 800: Clear
     * 80x: Clouds
     */
    _weatherCodeToText(code, fallback) {
        if (code === null || code === undefined || isNaN(code)) {
            return fallback || 'Unknown';
        }
        var id = Number(code);

        // Thunderstorm (2xx)
        if (id >= 200 && id < 300) {
            if (id === 200) return 'Thunderstorm';
            if (id === 201) return 'Heavy Thunderstorm';
            if (id === 202) return 'Severe Thunderstorm';
            if (id >= 210 && id <= 212) return 'Lightning';
            if (id === 221) return 'Ragged Storm';
            if (id >= 230 && id <= 232) return 'Storm w/ Drizzle';
            return 'Thunderstorm';
        }

        // Drizzle (3xx)
        if (id >= 300 && id < 400) {
            if (id === 300 || id === 310) return 'Light Drizzle';
            if (id === 301 || id === 311 || id === 313) return 'Drizzle';
            if (id === 302 || id === 312 || id === 314) return 'Heavy Drizzle';
            if (id === 321) return 'Shower Drizzle';
            return 'Drizzle';
        }

        // Rain (5xx)
        if (id >= 500 && id < 600) {
            if (id === 500) return 'Light Rain';
            if (id === 501) return 'Rain';
            if (id === 502) return 'Heavy Rain';
            if (id === 503) return 'Very Heavy Rain';
            if (id === 504) return 'Extreme Rain';
            if (id === 511) return 'Freezing Rain';
            if (id === 520) return 'Light Showers';
            if (id === 521) return 'Showers';
            if (id === 522) return 'Heavy Showers';
            if (id === 531) return 'Ragged Showers';
            return 'Rain';
        }

        // Snow (6xx)
        if (id >= 600 && id < 700) {
            if (id === 600) return 'Light Snow';
            if (id === 601) return 'Snow';
            if (id === 602) return 'Heavy Snow';
            if (id === 611) return 'Sleet';
            if (id === 612) return 'Light Sleet';
            if (id === 613) return 'Sleet Showers';
            if (id === 615 || id === 616) return 'Rain and Snow';
            if (id === 620) return 'Light Snow Shower';
            if (id === 621) return 'Snow Showers';
            if (id === 622) return 'Heavy Snow Shower';
            return 'Snow';
        }

        // Atmosphere (7xx)
        if (id >= 700 && id < 800) {
            if (id === 701) return 'Mist';
            if (id === 711) return 'Smoke';
            if (id === 721) return 'Haze';
            if (id === 731 || id === 761) return 'Dust';
            if (id === 741) return 'Fog';
            if (id === 751) return 'Sand';
            if (id === 762) return 'Volcanic Ash';
            if (id === 771) return 'Squalls';
            if (id === 781) return 'Tornado';
            return 'Low Visibility';
        }

        // Clear (800)
        if (id === 800) return 'Clear';

        // Clouds (80x)
        if (id >= 801 && id < 900) {
            if (id === 801) return 'Few Clouds';
            if (id === 802) return 'Partly Cloudy';
            if (id === 803) return 'Mostly Cloudy';
            if (id === 804) return 'Cloudy';
            return 'Cloudy';
        }

        return fallback || 'Unknown';
    }
}

module.exports = OpenWeatherService;
