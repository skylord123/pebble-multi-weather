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

var DetailedForecastPage = {
    menu: null,

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

        var items = this._buildItems(weatherData.forecastPeriods, providerId);
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
    _buildItems: function(periods, providerId) {
        var items = [];

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
            }
            items.push({
                title: period.name,
                subtitle: period.shortForecast,
                periodIndex: i,
                icon: icon
            });
        }

        return items;
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
