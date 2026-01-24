/**
 * MetNoService - Meteorologisk institutt (met.no) API implementation
 */

var ajax = require('lib/ajax');
var WeatherService = require('app/services/WeatherService');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

class MetNoService extends WeatherService {
    constructor() {
        super(Constants.providers.metno);
    }

    _request(url, onSuccess, onError) {
        var log = helpers.log;
        log('MetNo Request: ' + url);

        ajax({
            url: url,
            type: 'json',
            headers: {
                'User-Agent': Constants.userAgent
            }
        }, function(data, status) {
            log('MetNo Response status: ' + status);
            onSuccess(data);
        }, function(error, status) {
            log('MetNo Error: ' + status + ' - ' + JSON.stringify(error));
            onError(error, status);
        });
    }

    _buildUrl(latitude, longitude) {
        var params = [
            'lat=' + latitude.toFixed(4),
            'lon=' + longitude.toFixed(4)
        ];
        return this.baseUrl + '/compact?' + params.join('&');
    }

    fetchWeather(latitude, longitude, onSuccess, onError) {
        var self = this;
        var log = helpers.log;
        var url = this._buildUrl(latitude, longitude);

        log('MetNo: Fetching weather for ' + latitude + ', ' + longitude);

        this._request(url, function(data) {
            var timeseries = data && data.properties && data.properties.timeseries;
            if (!timeseries || !timeseries.length) {
                onError('Invalid MET Norway response');
                return;
            }

            var currentEntry = timeseries[0];
            var currentDetails = currentEntry.data && currentEntry.data.instant
                ? currentEntry.data.instant.details
                : {};

            var currentTempC = currentDetails.air_temperature;
            var currentTempF = self._cToF(currentTempC);
            var humidity = self._roundValue(currentDetails.relative_humidity);
            var windSpeedMph = self._mpsToMph(currentDetails.wind_speed);
            var windDirection = self._degreesToCompass(currentDetails.wind_from_direction);
            var barometer = self._hPaToPa(currentDetails.air_pressure_at_sea_level);

            var currentSymbolCode = self._getSymbolCode(currentEntry);
            var conditions = self._symbolCodeToText(currentSymbolCode);

            var hourlyPeriods = self._buildHourlyPeriods(timeseries);
            var dailyForecast = self._buildDailyForecast(timeseries);

            var rangeFromHourly = self._computeTempRange(hourlyPeriods);
            var todayStats = dailyForecast.length ? dailyForecast[0] : null;
            var highTemp = rangeFromHourly.max !== null ? rangeFromHourly.max : (todayStats ? todayStats.highTemp : null);
            var lowTemp = rangeFromHourly.min !== null ? rangeFromHourly.min : (todayStats ? todayStats.lowTemp : null);

            var weatherData = {
                provider: self.id,
                location: 'MET Norway',
                currentTemp: currentTempF,
                highTemp: highTemp,
                lowTemp: lowTemp,
                conditions: conditions,
                currentSymbolCode: currentSymbolCode,
                humidity: humidity,
                windSpeed: windSpeedMph,
                windDirection: windDirection,
                barometer: barometer,
                dewpoint: null,
                visibility: null,
                observationTime: self._parseTime(currentEntry.time),
                forecastPeriods: dailyForecast.map(function(day) { return day.period; }),
                hourlyForecast: { periods: hourlyPeriods },
                timestamp: Date.now()
            };

            onSuccess(weatherData);
        }, function(err) {
            log('MetNo: Request error - ' + err);
            onError(err);
        });
    }

    _buildHourlyPeriods(timeseries) {
        var periods = [];
        var count = Math.min(timeseries.length, 24);
        for (var i = 0; i < count; i++) {
            var entry = timeseries[i];
            var time = this._parseTime(entry.time);
            var nextTime = (i + 1 < timeseries.length)
                ? this._parseTime(timeseries[i + 1].time)
                : (time ? time + 60 * 60 * 1000 : null);
            var details = entry.data && entry.data.instant ? entry.data.instant.details : {};
            var symbolCode = this._getSymbolCode(entry);

            periods.push({
                number: i + 1,
                name: '',
                startTime: time,
                endTime: nextTime,
                isDaytime: null,
                temperature: this._cToF(details.air_temperature),
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: null
                },
                dewpoint: {
                    unitCode: null,
                    value: null
                },
                relativeHumidity: {
                    unitCode: 'wmoUnit:percent',
                    value: this._roundValue(details.relative_humidity)
                },
                windSpeed: this._mpsToMph(details.wind_speed),
                windDirection: this._degreesToCompass(details.wind_from_direction),
                icon: null,
                symbolCode: symbolCode,
                shortForecast: this._symbolCodeToText(symbolCode),
                detailedForecast: ''
            });
        }

        return periods;
    }

    _buildDailyForecast(timeseries) {
        var dayMap = {};
        var order = [];

        for (var i = 0; i < timeseries.length; i++) {
            var entry = timeseries[i];
            var time = this._parseTime(entry.time);
            if (!time) {
                continue;
            }
            var date = new Date(time);
            if (isNaN(date.getTime())) {
                continue;
            }
            var key = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
            if (!dayMap[key]) {
                dayMap[key] = {
                    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    minTempC: null,
                    maxTempC: null,
                    symbolCode: null,
                    symbolHourDiff: null,
                    windSpeed: null,
                    windDirection: null
                };
                order.push(key);
            }

            var day = dayMap[key];
            var details = entry.data && entry.data.instant ? entry.data.instant.details : {};
            var tempC = details.air_temperature;
            if (tempC !== null && tempC !== undefined && !isNaN(tempC)) {
                day.minTempC = (day.minTempC === null) ? tempC : Math.min(day.minTempC, tempC);
                day.maxTempC = (day.maxTempC === null) ? tempC : Math.max(day.maxTempC, tempC);
            }

            var symbolCode = this._getSymbolCode(entry);
            if (symbolCode) {
                var hourDiff = Math.abs(date.getHours() - 12);
                if (day.symbolHourDiff === null || hourDiff < day.symbolHourDiff) {
                    day.symbolHourDiff = hourDiff;
                    day.symbolCode = symbolCode;
                    day.windSpeed = this._mpsToMph(details.wind_speed);
                    day.windDirection = this._degreesToCompass(details.wind_from_direction);
                }
            }
        }

        var days = [];
        for (var j = 0; j < order.length; j++) {
            var key = order[j];
            var day = dayMap[key];
            var maxF = this._cToF(day.maxTempC);
            var minF = this._cToF(day.minTempC);
            var symbol = day.symbolCode;
            var text = this._symbolCodeToText(symbol);

            var period = {
                number: j + 1,
                name: this._formatDayName(day.date ? day.date.getTime() : null, j),
                startTime: day.date ? day.date.getTime() : null,
                endTime: day.date ? day.date.getTime() + 24 * 60 * 60 * 1000 : null,
                isDaytime: true,
                temperature: maxF,
                temperatureUnit: null,
                temperatureTrend: null,
                probabilityOfPrecipitation: {
                    unitCode: 'wmoUnit:percent',
                    value: null
                },
                windSpeed: day.windSpeed,
                windDirection: day.windDirection,
                icon: null,
                symbolCode: symbol,
                shortForecast: text,
                detailedForecast: text
            };

            days.push({
                highTemp: maxF,
                lowTemp: minF,
                period: period
            });
        }

        return days.slice(0, 7);
    }

    _getSymbolCode(entry) {
        if (!entry || !entry.data) {
            return null;
        }
        if (entry.data.next_1_hours && entry.data.next_1_hours.summary) {
            return entry.data.next_1_hours.summary.symbol_code;
        }
        if (entry.data.next_6_hours && entry.data.next_6_hours.summary) {
            return entry.data.next_6_hours.summary.symbol_code;
        }
        if (entry.data.next_12_hours && entry.data.next_12_hours.summary) {
            return entry.data.next_12_hours.summary.symbol_code;
        }
        return null;
    }

    _symbolCodeToText(symbolCode) {
        if (!symbolCode || typeof symbolCode !== 'string') {
            return 'Unknown';
        }
        var code = symbolCode.toLowerCase();

        if (code.indexOf('thunder') !== -1) return 'Thunder';
        if (code.indexOf('sleet') !== -1 && code.indexOf('rain') !== -1) return 'Sleet';
        if (code.indexOf('snow') !== -1 && code.indexOf('rain') !== -1) return 'Wintry Mix';
        if (code.indexOf('snow') !== -1) return 'Snow';
        if (code.indexOf('sleet') !== -1) return 'Sleet';
        if (code.indexOf('rain') !== -1) return 'Rain';
        if (code.indexOf('fog') !== -1) return 'Fog';
        if (code.indexOf('cloudy') !== -1) return 'Cloudy';
        if (code.indexOf('partlycloudy') !== -1) return 'Partly Cloudy';
        if (code.indexOf('fair') !== -1) return 'Fair';
        if (code.indexOf('clearsky') !== -1) return 'Clear';

        return 'Unknown';
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

    _parseTime(value) {
        if (!value) {
            return null;
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date.getTime();
    }

    _computeTempRange(periods) {
        var min = null;
        var max = null;
        if (!periods || !periods.length) {
            return { min: null, max: null };
        }
        for (var i = 0; i < periods.length; i++) {
            var temp = periods[i].temperature;
            if (temp === null || temp === undefined || isNaN(temp)) {
                continue;
            }
            min = (min === null) ? temp : Math.min(min, temp);
            max = (max === null) ? temp : Math.max(max, temp);
        }
        return { min: min, max: max };
    }

    _cToF(valueC) {
        if (valueC === null || valueC === undefined || isNaN(valueC)) {
            return null;
        }
        return helpers.celsiusToFahrenheit(valueC);
    }

    _hPaToPa(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return value * 100;
    }

    _mpsToMph(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return value * 2.236936;
    }

    _roundValue(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return Math.round(value);
    }
}

module.exports = MetNoService;
