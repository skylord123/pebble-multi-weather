/**
 * ForecastPeriodPage - Shows detailed info for a single forecast period
 *
 * Displays start/end time, temperature, precipitation, wind,
 * short forecast, and detailed forecast.
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var MenuTheme = require('app/ui/MenuTheme');

var ForecastPeriodPage = {
    menu: null,

    /**
     * Show the forecast period details
     * @param {string} providerId - Provider identifier
     * @param {Object} period - Forecast period data
     */
    show: function(providerId, period) {
        var log = helpers.log;

        log('ForecastPeriodPage: Showing ' + period.name);

        var items = this._buildItems(period);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: period.name,
                items: items
            }]
        });

        // Handle select to show detailed forecast in a card
        this.menu.on('select', function(e) {
            if (e.item.id === 'detailed') {
                var card = new UI.Card({
                    title: period.name,
                    body: period.detailedForecast || 'No detailed forecast available.',
                    scrollable: true
                });
                card.show();
            }
        });

        this.menu.show();
    },

    /**
     * Build menu items from period data
     * @private
     */
    _buildItems: function(period) {
        var items = [];

        // Start Time
        items.push({
            title: 'Start Time',
            subtitle: helpers.formatDateTime(period.startTime)
        });

        // End Time
        items.push({
            title: 'End Time',
            subtitle: helpers.formatDateTime(period.endTime)
        });

        // Temperature
        var appState = AppState.getInstance();
        var tempStr = helpers.formatTempDisplay(
            period.temperature,
            appState.temperatureUnit,
            appState.temperatureShowBoth
        );
        items.push({
            title: 'Temperature',
            subtitle: tempStr
        });

        // Precipitation Probability
        var precipProb = '--';
        if (period.probabilityOfPrecipitation &&
            period.probabilityOfPrecipitation.value !== null) {
            precipProb = period.probabilityOfPrecipitation.value + '%';
        }
        items.push({
            title: 'Precip Chance',
            subtitle: precipProb
        });

        // Wind
        var windStr = '--';
        var speedMph = helpers.parseWindSpeed(period.windSpeed);
        if (speedMph !== null && speedMph !== undefined) {
            windStr = helpers.formatWind(period.windDirection, speedMph, appState.speedUnit);
        } else if (period.windDirection || period.windSpeed) {
            windStr = (period.windDirection || '') + ' ' + (period.windSpeed || '');
            windStr = windStr.trim();
        }
        items.push({
            title: 'Wind',
            subtitle: windStr
        });

        // Short Forecast
        items.push({
            title: 'Short Forecast',
            subtitle: period.shortForecast || '--'
        });

        // Detailed Forecast (clickable) - only show if there's a detailed forecast
        // that's different from the short forecast
        if (period.detailedForecast && period.detailedForecast !== period.shortForecast) {
            items.push({
                title: 'Detailed Forecast',
                subtitle: 'Tap to view...',
                id: 'detailed'
            });
        }

        return items;
    }
};

module.exports = ForecastPeriodPage;
