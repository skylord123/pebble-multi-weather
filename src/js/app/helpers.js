/**
 * helpers - Utility functions for the app
 */

var Constants = require('app/Constants');

var helpers = {
    /**
     * Log a message to console if debug is enabled
     * @param {string} message - Message to log
     */
    log: function(message) {
        if (Constants.debug) {
            console.log('[MultiWeather] ' + message);
        }
    },

    /**
     * Format temperature with unit
     * @param {number} tempF - Temperature value in Fahrenheit
     * @param {string} unit - Unit ('F' or 'C')
     * @returns {string} Formatted temperature (e.g., "72F")
     */
    formatTemp: function(tempF, unit) {
        if (tempF === null || tempF === undefined || isNaN(tempF)) {
            return '--';
        }
        unit = unit || Constants.defaultUnit;
        var value = tempF;
        if (unit === Constants.units.CELSIUS) {
            value = this.fahrenheitToCelsius(tempF);
        }
        if (value === null || value === undefined || isNaN(value)) {
            return '--';
        }
        return Math.round(value) + unit;
    },

    /**
     * Format temperature with both F and C
     * @param {number} tempF - Temperature in Fahrenheit
     * @returns {string} Formatted string (e.g., "72F (22.2C)")
     */
    formatTempBoth: function(tempF) {
        return this.formatTempDisplay(tempF, Constants.defaultUnit, true);
    },

    /**
     * Format temperature using preferred unit and optional dual display
     * @param {number} tempF - Temperature in Fahrenheit
     * @param {string} preferredUnit - 'F' or 'C'
     * @param {boolean} showBoth - Whether to include both units
     * @returns {string}
     */
    formatTempDisplay: function(tempF, preferredUnit, showBoth) {
        if (tempF === null || tempF === undefined || isNaN(tempF)) {
            return '--';
        }

        preferredUnit = preferredUnit || Constants.defaultUnit;
        if (!showBoth) {
            return this.formatTemp(tempF, preferredUnit);
        }

        var tempC = this.fahrenheitToCelsius(tempF);
        if (preferredUnit === Constants.units.CELSIUS) {
            return tempC.toFixed(1) + 'C (' + Math.round(tempF) + 'F)';
        }
        return Math.round(tempF) + 'F (' + tempC.toFixed(1) + 'C)';
    },

    /**
     * Format high/low temperature string
     * @param {number} high - High temperature
     * @param {number} low - Low temperature
     * @param {string} unit - Unit ('F' or 'C')
     * @returns {string} Formatted string (e.g., "H:72 L:45")
     */
    formatHighLow: function(high, low, unit) {
        unit = unit || Constants.defaultUnit;
        var highStr = this.formatTemp(high, unit);
        var lowStr = this.formatTemp(low, unit);
        return highStr + ' / ' + lowStr;
    },

    /**
     * Format high/low temperature string with optional dual display
     * @param {number} high - High temperature (F)
     * @param {number} low - Low temperature (F)
     * @param {string} unit - Preferred unit
     * @param {boolean} showBoth - Whether to include both units
     * @returns {string}
     */
    formatHighLowDisplay: function(high, low, unit, showBoth) {
        var highStr = this.formatTempDisplay(high, unit, showBoth);
        var lowStr = this.formatTempDisplay(low, unit, showBoth);
        return highStr + ' / ' + lowStr;
    },

    /**
     * Format weather summary for menu subtitle
     * @param {number} current - Current temperature
     * @param {number} high - High temperature
     * @param {number} low - Low temperature
     * @param {string} unit - Unit ('F' or 'C')
     * @returns {string} Formatted string (e.g., "72F - H:80 L:65")
     */
    formatWeatherSummary: function(current, high, low, unit, showBoth) {
        unit = unit || Constants.defaultUnit;
        var currentStr = this.formatTempDisplay(current, unit, showBoth);
        var highLowStr = this.formatHighLowDisplay(high, low, unit, showBoth);
        return currentStr + ' - ' + highLowStr;
    },

    /**
     * Convert Celsius to Fahrenheit
     * @param {number} celsius - Temperature in Celsius
     * @returns {number} Temperature in Fahrenheit
     */
    celsiusToFahrenheit: function(celsius) {
        if (celsius === null || celsius === undefined) {
            return null;
        }
        return (celsius * 9 / 5) + 32;
    },

    /**
     * Convert Fahrenheit to Celsius
     * @param {number} fahrenheit - Temperature in Fahrenheit
     * @returns {number} Temperature in Celsius
     */
    fahrenheitToCelsius: function(fahrenheit) {
        if (fahrenheit === null || fahrenheit === undefined) {
            return null;
        }
        return (fahrenheit - 32) * 5 / 9;
    },

    /**
     * Convert Pascals to inches of mercury
     * @param {number} pascals - Pressure in Pascals
     * @returns {number} Pressure in inches of mercury
     */
    pascalsToInHg: function(pascals) {
        if (pascals === null || pascals === undefined) {
            return null;
        }
        return pascals * 0.0002953;
    },

    /**
     * Convert Pascals to millibars
     * @param {number} pascals - Pressure in Pascals
     * @returns {number} Pressure in millibars
     */
    pascalsToMb: function(pascals) {
        if (pascals === null || pascals === undefined) {
            return null;
        }
        return pascals / 100;
    },

    /**
     * Format barometric pressure with both units
     * @param {number} pascals - Pressure in Pascals
     * @returns {string} Formatted string (e.g., "29.94 in (1013.89 mb)")
     */
    formatBarometer: function(pascals) {
        if (pascals === null || pascals === undefined) {
            return '--';
        }
        var inHg = this.pascalsToInHg(pascals);
        var mb = this.pascalsToMb(pascals);
        return inHg.toFixed(2) + ' in (' + mb.toFixed(2) + ' mb)';
    },

    /**
     * Convert meters to miles
     * @param {number} meters - Distance in meters
     * @returns {number} Distance in miles
     */
    metersToMiles: function(meters) {
        if (meters === null || meters === undefined) {
            return null;
        }
        return meters * 0.000621371;
    },

    /**
     * Convert mph to km/h
     * @param {number} mph - Speed in miles per hour
     * @returns {number} Speed in km/h
     */
    mphToKmh: function(mph) {
        if (mph === null || mph === undefined) {
            return null;
        }
        return mph * 1.60934;
    },

    /**
     * Format visibility
     * @param {number} meters - Visibility in meters
     * @returns {string} Formatted string (e.g., "10.00 mi")
     */
    formatVisibility: function(meters) {
        if (meters === null || meters === undefined) {
            return '--';
        }
        var miles = this.metersToMiles(meters);
        return miles.toFixed(2) + ' mi';
    },

    /**
     * Format wind speed and direction
     * @param {string} direction - Wind direction (e.g., "S", "NW")
     * @param {number} speedMph - Wind speed in MPH
     * @returns {string} Formatted string (e.g., "S 3 MPH")
     */
    formatWind: function(direction, speedMph, unit) {
        if (speedMph === null || speedMph === undefined || isNaN(speedMph)) {
            return '--';
        }
        unit = unit || Constants.speedUnits.MPH;
        var dir = direction || '';
        var speed = speedMph;
        var suffix = 'MPH';
        if (unit === Constants.speedUnits.KMH) {
            speed = this.mphToKmh(speedMph);
            suffix = 'KMH';
        }
        if (speed === null || speed === undefined || isNaN(speed)) {
            return '--';
        }
        return dir + ' ' + Math.round(speed) + ' ' + suffix;
    },

    /**
     * Parse wind speed value from string or number
     * @param {string|number} value
     * @returns {number|null} Speed in mph
     */
    parseWindSpeed: function(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'number') {
            return value;
        }
        var matches = value.toString().match(/[\\d.]+/g);
        if (!matches || !matches.length) {
            return null;
        }
        var first = parseFloat(matches[0]);
        if (matches.length === 1) {
            return first;
        }
        var second = parseFloat(matches[1]);
        if (isNaN(first) || isNaN(second)) {
            return null;
        }
        return (first + second) / 2;
    },

    /**
     * Process a custom template string with weather data
     * @param {string} template - Template string with placeholders
     * @param {Object} weatherData - Weather data object
     * @param {string} unit - Preferred temperature unit ('F' or 'C')
     * @param {string} speedUnit - Preferred speed unit ('mph' or 'kmh')
     * @returns {string} Processed template string
     */
    processCustomTemplate: function(template, weatherData, unit, speedUnit) {
        if (!template || !weatherData) {
            return template || '';
        }

        var self = this;
        var tempF = weatherData.currentTemp;
        var tempC = tempF !== null && tempF !== undefined ? this.fahrenheitToCelsius(tempF) : null;
        var highF = weatherData.highTemp;
        var lowF = weatherData.lowTemp;
        var highC = highF !== null && highF !== undefined ? this.fahrenheitToCelsius(highF) : null;
        var lowC = lowF !== null && lowF !== undefined ? this.fahrenheitToCelsius(lowF) : null;
        var windMph = weatherData.windSpeed;
        var windKph = windMph !== null && windMph !== undefined ? this.mphToKmh(windMph) : null;

        var replacements = {
            // Temperature based on selected unit
            '{temp}': this.formatTemp(tempF, unit),
            '{temp_high}': this.formatTemp(highF, unit),
            '{temp_low}': this.formatTemp(lowF, unit),
            // Explicit Fahrenheit
            '{temp_f}': tempF !== null && tempF !== undefined ? Math.round(tempF) + 'F' : '--',
            '{temp_f_high}': highF !== null && highF !== undefined ? Math.round(highF) + 'F' : '--',
            '{temp_f_low}': lowF !== null && lowF !== undefined ? Math.round(lowF) + 'F' : '--',
            // Explicit Celsius
            '{temp_c}': tempC !== null && tempC !== undefined ? Math.round(tempC) + 'C' : '--',
            '{temp_c_high}': highC !== null && highC !== undefined ? Math.round(highC) + 'C' : '--',
            '{temp_c_low}': lowC !== null && lowC !== undefined ? Math.round(lowC) + 'C' : '--',
            // Wind speed based on selected unit
            '{windspeed}': (function() {
                if (windMph === null || windMph === undefined) return '--';
                if (speedUnit === Constants.speedUnits.KMH) {
                    return Math.round(windKph) + 'kph';
                }
                return Math.round(windMph) + 'mph';
            })(),
            // Explicit wind speeds
            '{windspeed_mph}': windMph !== null && windMph !== undefined ? Math.round(windMph) + 'mph' : '--',
            '{windspeed_kph}': windKph !== null && windKph !== undefined ? Math.round(windKph) + 'kph' : '--',
            // Wind direction
            '{wind_direction}': weatherData.windDirection || '--',
            // Conditions
            '{humidity}': weatherData.humidity !== null && weatherData.humidity !== undefined ? weatherData.humidity + '%' : '--',
            '{conditions}': weatherData.conditions || '--',
            '{forecast}': (weatherData.forecastPeriods && weatherData.forecastPeriods.length > 0)
                ? (weatherData.forecastPeriods[0].shortForecast || '--')
                : '--'
        };

        var result = template;
        for (var key in replacements) {
            if (replacements.hasOwnProperty(key)) {
                result = result.split(key).join(replacements[key]);
            }
        }
        return result;
    },

    /**
     * Format timestamp as readable date/time
     * @param {number|string} timestamp - Unix timestamp (ms) or ISO string
     * @returns {string} Formatted string (e.g., "23 Jan 12:30 PM MST")
     */
    formatDateTime: function(timestamp) {
        if (!timestamp) {
            return '--';
        }

        var date;
        if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            return '--';
        }

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var day = date.getDate();
        var month = months[date.getMonth()];
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;
        var minuteStr = minutes < 10 ? '0' + minutes : minutes;

        return day + ' ' + month + ' ' + hours + ':' + minuteStr + ' ' + ampm;
    },

    /**
     * Format timestamp as compact date/time (only show minutes if not on the hour)
     * @param {number|string} timestamp - Unix timestamp (ms) or ISO string
     * @returns {string} Formatted string (e.g., "25 Jan 5PM" or "25 Jan 6:30PM")
     */
    formatDateTimeCompact: function(timestamp) {
        if (!timestamp) {
            return '--';
        }

        var date;
        if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) {
            return '--';
        }

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var day = date.getDate();
        var month = months[date.getMonth()];
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;

        // Only show minutes if not on the hour
        var timeStr;
        if (minutes === 0) {
            timeStr = hours + ampm;
        } else {
            var minuteStr = minutes < 10 ? '0' + minutes : minutes;
            timeStr = hours + ':' + minuteStr + ampm;
        }

        return day + ' ' + month + ' ' + timeStr;
    }
};

module.exports = helpers;
