/**
 * DetailedForecastPage - Shows list of forecast periods
 *
 * Displays forecast periods (This Afternoon, Tonight, Saturday, etc.)
 * with short forecast as subtitle.
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var ForecastPeriodPage = require('app/pages/ForecastPeriodPage');
var MenuTheme = require('app/ui/MenuTheme');
var IconMapper = require('app/IconMapper');
var Constants = require('app/Constants');

var DetailedForecastPage = {
    menu: null,

    /**
     * Get the formatted subtitle for a forecast period based on current settings
     * This can be called from provider menu pages to display the forecast subtitle
     * @param {Object} period - Forecast period object
     * @param {Object} hourlyForecast - Hourly forecast data (optional)
     * @returns {string} Formatted subtitle
     */
    getSubtitleForPeriod: function(period, hourlyForecast) {
        var appState = AppState.getInstance();
        var subtitleMode = appState.detailedForecastSubtitle || Constants.detailedForecastSubtitle.SHORT_FORECAST;
        return this._getSubtitle(period, subtitleMode, hourlyForecast, appState);
    },

    /**
     * Show the detailed forecast page
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('DetailedForecastPage: Showing for ' + providerId);

        var weatherData = appState.getWeatherData(providerId);

        if (!weatherData || !weatherData.forecastPeriods || weatherData.forecastPeriods.length === 0) {
            this._showNoData();
            return;
        }

        var items = this._buildItems(weatherData.forecastPeriods, providerId, weatherData.hourlyForecast);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Forecast',
                items: items
            }]
        });

        this.menu.on('select', function(e) {
            self._onSelect(e, providerId, weatherData.forecastPeriods);
        });

        this.menu.show();
    },

    /**
     * Build menu items from forecast periods
     * @private
     */
    _buildItems: function(periods, providerId, hourlyForecast) {
        var items = [];
        var appState = AppState.getInstance();
        var subtitleMode = appState.detailedForecastSubtitle || Constants.detailedForecastSubtitle.SHORT_FORECAST;

        for (var i = 0; i < periods.length; i++) {
            var period = periods[i];
            var icon = null;
            if (providerId === 'nws') {
                icon = IconMapper.getIconForNws(period.icon);
            } else if (providerId === 'openmeteo') {
                icon = IconMapper.getIconForOpenMeteo(period.weatherCode);
            } else if (providerId === 'metno') {
                icon = IconMapper.getIconForMetNo(period.symbolCode);
            } else if (providerId === 'openweather') {
                icon = IconMapper.getIconForOpenWeather(period.weatherCode);
            } else if (providerId === 'weatherapi') {
                icon = IconMapper.getIconForWeatherAPI(period.weatherCode);
            }

            var subtitle = this._getSubtitle(period, subtitleMode, hourlyForecast, appState);

            items.push({
                title: period.name,
                subtitle: subtitle,
                periodIndex: i,
                icon: icon
            });
        }

        return items;
    },

    /**
     * Get the subtitle for a forecast period based on the configured mode
     * @private
     */
    _getSubtitle: function(period, subtitleMode, hourlyForecast, appState) {
        var highLow;

        switch (subtitleMode) {
            case Constants.detailedForecastSubtitle.LONG_FORECAST:
                return period.detailedForecast || period.shortForecast || '';

            case Constants.detailedForecastSubtitle.SHORT_FORECAST_TEMP:
                highLow = this._getHighLowFromHourly(period, hourlyForecast);
                if (highLow) {
                    var tempStr = this._formatHighLow(highLow, appState);
                    return (period.shortForecast || '') + ' ' + tempStr;
                }
                return period.shortForecast || '';

            case Constants.detailedForecastSubtitle.HIGH_LOW_TEMP:
                highLow = this._getHighLowFromHourly(period, hourlyForecast);
                if (highLow) {
                    return this._formatHighLow(highLow, appState);
                }
                return '';

            case Constants.detailedForecastSubtitle.WIND:
                return this._formatWind(period);

            case Constants.detailedForecastSubtitle.CUSTOM_TEMPLATE:
                return this._processSubtitleTemplate(period, hourlyForecast, appState);

            case Constants.detailedForecastSubtitle.SHORT_FORECAST:
            default:
                return period.shortForecast || '';
        }
    },

    /**
     * Process a custom template for forecast subtitle
     * @private
     */
    _processSubtitleTemplate: function(period, hourlyForecast, appState) {
        var template = appState.detailedForecastSubtitleTemplate || Constants.defaultDetailedForecastSubtitleTemplate;
        var unit = appState.temperatureUnit || 'F';
        var speedUnit = appState.speedUnit || Constants.speedUnits.MPH;

        // Get high/low from hourly data
        var highLow = this._getHighLowFromHourly(period, hourlyForecast);
        var highF = highLow ? highLow.high : null;
        var lowF = highLow ? highLow.low : null;
        var highC = highF !== null ? helpers.fahrenheitToCelsius(highF) : null;
        var lowC = lowF !== null ? helpers.fahrenheitToCelsius(lowF) : null;

        // Get temperature from period (if available)
        var tempF = period.temperature;
        var tempC = tempF !== null && tempF !== undefined ? helpers.fahrenheitToCelsius(tempF) : null;

        // Parse wind speed
        var windMph = helpers.parseWindSpeed(period.windSpeed);
        var windKph = windMph !== null ? helpers.mphToKmh(windMph) : null;

        // Build replacements map
        var replacements = {
            // Temperature based on selected unit
            '{temp}': helpers.formatTemp(tempF, unit),
            '{temp_high}': helpers.formatTemp(highF, unit),
            '{temp_low}': helpers.formatTemp(lowF, unit),
            // Explicit Fahrenheit
            '{temp_f}': tempF !== null && tempF !== undefined ? Math.round(tempF) + 'F' : '--',
            '{temp_f_high}': highF !== null ? Math.round(highF) + 'F' : '--',
            '{temp_f_low}': lowF !== null ? Math.round(lowF) + 'F' : '--',
            // Explicit Celsius
            '{temp_c}': tempC !== null ? Math.round(tempC) + 'C' : '--',
            '{temp_c_high}': highC !== null ? Math.round(highC) + 'C' : '--',
            '{temp_c_low}': lowC !== null ? Math.round(lowC) + 'C' : '--',
            // Wind - full formatted string (direction + speed)
            '{wind}': this._formatWind(period) || '--',
            // Wind speed based on selected unit
            '{windspeed}': (function() {
                if (windMph === null) return '--';
                if (speedUnit === Constants.speedUnits.KMH) {
                    return Math.round(windKph) + 'kph';
                }
                return Math.round(windMph) + 'mph';
            })(),
            // Explicit wind speeds
            '{windspeed_mph}': windMph !== null ? Math.round(windMph) + 'mph' : '--',
            '{windspeed_kph}': windKph !== null ? Math.round(windKph) + 'kph' : '--',
            // Wind direction
            '{wind_direction}': period.windDirection || '--',
            // Forecasts
            '{short_forecast}': period.shortForecast || '--',
            '{long_forecast}': period.detailedForecast || period.shortForecast || '--',
            // Precipitation
            '{precip}': period.precipitationChance !== null && period.precipitationChance !== undefined
                ? period.precipitationChance + '%'
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
     * Calculate high/low temperature from hourly forecast data for a period
     * @private
     */
    _getHighLowFromHourly: function(period, hourlyForecast) {
        if (!hourlyForecast || !hourlyForecast.periods || !hourlyForecast.periods.length) {
            return null;
        }
        if (!period.startTime || !period.endTime) {
            return null;
        }

        var periodStart = period.startTime;
        var periodEnd = period.endTime;
        var hourlyPeriods = hourlyForecast.periods;

        // Find hourly periods that fall within this forecast period
        var matchingTemps = [];
        var coveredStart = null;
        var coveredEnd = null;

        for (var i = 0; i < hourlyPeriods.length; i++) {
            var hourly = hourlyPeriods[i];
            if (!hourly.startTime || hourly.temperature === null || hourly.temperature === undefined) {
                continue;
            }

            // Check if this hourly period overlaps with our forecast period
            var hourlyStart = hourly.startTime;
            var hourlyEnd = hourly.endTime || (hourlyStart + 3600000); // Default to 1 hour

            if (hourlyStart < periodEnd && hourlyEnd > periodStart) {
                matchingTemps.push(hourly.temperature);

                // Track coverage
                if (coveredStart === null || hourlyStart < coveredStart) {
                    coveredStart = hourlyStart;
                }
                if (coveredEnd === null || hourlyEnd > coveredEnd) {
                    coveredEnd = hourlyEnd;
                }
            }
        }

        if (matchingTemps.length === 0) {
            return null;
        }

        // Check if we have reasonable coverage of the period
        // Allow some tolerance (within 1 hour of start and end)
        var tolerance = 3600000; // 1 hour in ms
        if (coveredStart > periodStart + tolerance || coveredEnd < periodEnd - tolerance) {
            return null;
        }

        var high = Math.max.apply(null, matchingTemps);
        var low = Math.min.apply(null, matchingTemps);

        return { high: Math.round(high), low: Math.round(low) };
    },

    /**
     * Format high/low temperature for display
     * @private
     */
    _formatHighLow: function(highLow, appState) {
        var unit = appState.temperatureUnit || 'F';
        var showBoth = appState.temperatureShowBoth;
        var high = highLow.high;
        var low = highLow.low;

        if (showBoth) {
            var highC = helpers.fahrenheitToCelsius(high);
            var lowC = helpers.fahrenheitToCelsius(low);
            if (unit === 'C') {
                return 'H:' + highC + '°C/' + high + '°F L:' + lowC + '°C/' + low + '°F';
            }
            return 'H:' + high + '°/' + highC + '°C L:' + low + '°/' + lowC + '°C';
        }

        if (unit === 'C') {
            high = helpers.fahrenheitToCelsius(high);
            low = helpers.fahrenheitToCelsius(low);
        }

        return 'H:' + high + '° L:' + low + '°';
    },

    /**
     * Format wind information for display
     * @private
     */
    _formatWind: function(period) {
        var parts = [];
        if (period.windDirection) {
            parts.push(period.windDirection);
        }
        if (period.windSpeed) {
            parts.push(period.windSpeed);
        }
        return parts.join(' ') || '';
    },

    /**
     * Handle menu item selection
     * @private
     */
    _onSelect: function(e, providerId, periods) {
        var log = helpers.log;
        var periodIndex = e.item.periodIndex;

        log('DetailedForecastPage: Selected period ' + periodIndex);

        if (periodIndex !== undefined && periods[periodIndex]) {
            ForecastPeriodPage.show(providerId, periods[periodIndex]);
        }
    },

    /**
     * Show a message when no data is available
     * @private
     */
    _showNoData: function() {
        var card = new UI.Card({
            title: 'No Forecast',
            body: 'Forecast data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = DetailedForecastPage;
