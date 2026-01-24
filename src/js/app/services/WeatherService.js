/**
 * WeatherService - Base class for weather providers
 *
 * All weather providers should extend this class and implement
 * the required methods.
 */

var helpers = require('app/helpers');
var Constants = require('app/Constants');

class WeatherService {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.fullName = config.fullName || config.name;
        this.baseUrl = config.baseUrl;
    }

    /**
     * Get the provider ID
     * @returns {string}
     */
    getId() {
        return this.id;
    }

    /**
     * Get the display name
     * @returns {string}
     */
    getName() {
        return this.name;
    }

    /**
     * Fetch weather data for the given coordinates
     * Must be implemented by subclasses
     *
     * @param {number} latitude
     * @param {number} longitude
     * @param {Function} onSuccess - Callback with weather data
     * @param {Function} onError - Callback with error message
     */
    fetchWeather(latitude, longitude, onSuccess, onError) {
        throw new Error('fetchWeather must be implemented by subclass');
    }

    /**
     * Get a summary suitable for the main menu subtitle
     * @param {Object} weatherData - Weather data from fetchWeather
     * @param {string} unit - Temperature unit ('F' or 'C')
     * @returns {string} Summary string (e.g., "72F - H:80 L:65")
     */
    getSummary(weatherData, unit, showBoth, speedUnit, quickGlance) {
        if (!weatherData) {
            return 'No data';
        }

        if (quickGlance === Constants.quickGlance.HUMIDITY) {
            if (weatherData.humidity === null || weatherData.humidity === undefined) {
                return 'Humidity: --';
            }
            return 'Humidity: ' + weatherData.humidity + '%';
        }

        if (quickGlance === Constants.quickGlance.WIND) {
            return helpers.formatWind(weatherData.windDirection, weatherData.windSpeed, speedUnit);
        }

        if (quickGlance === Constants.quickGlance.FORECAST) {
            if (weatherData.forecastPeriods && weatherData.forecastPeriods.length > 0) {
                return weatherData.forecastPeriods[0].shortForecast || 'Forecast unavailable';
            }
            return 'Forecast unavailable';
        }

        return helpers.formatWeatherSummary(
            weatherData.currentTemp,
            weatherData.highTemp,
            weatherData.lowTemp,
            unit,
            showBoth
        );
    }
}

module.exports = WeatherService;
