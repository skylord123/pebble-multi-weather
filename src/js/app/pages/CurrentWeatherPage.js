/**
 * CurrentWeatherPage - Detailed current weather conditions
 *
 * Shows all available weather data for a provider:
 * Temperature, High/Low, Humidity, Wind, Barometer, Dewpoint, Visibility, Last Update
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var MenuTheme = require('app/ui/MenuTheme');

var CurrentWeatherPage = {
    menu: null,

    /**
     * Show the current weather details page
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('CurrentWeatherPage: Showing for ' + providerId);

        var weatherData = appState.getWeatherData(providerId);

        if (!weatherData) {
            this._showNoData();
            return;
        }

        var items = this._buildItems(weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Current Conditions',
                items: items
            }]
        });

        this.menu.show();
    },

    /**
     * Build menu items from weather data
     * @private
     */
    _buildItems: function(data) {
        var items = [];

        var appState = AppState.getInstance();
        var preferredUnit = appState.temperatureUnit;
        var showBoth = appState.temperatureShowBoth;

        // Temperature
        items.push({
            title: 'Temperature',
            subtitle: helpers.formatTempDisplay(data.currentTemp, preferredUnit, showBoth)
        });

        // High Temp
        items.push({
            title: 'High Temp',
            subtitle: helpers.formatTempDisplay(data.highTemp, preferredUnit, showBoth)
        });

        // Low Temp
        items.push({
            title: 'Low Temp',
            subtitle: helpers.formatTempDisplay(data.lowTemp, preferredUnit, showBoth)
        });

        // Humidity
        items.push({
            title: 'Humidity',
            subtitle: data.humidity !== null ? data.humidity + '%' : '--'
        });

        // Wind Speed
        items.push({
            title: 'Wind Speed',
            subtitle: helpers.formatWind(data.windDirection, data.windSpeed, appState.speedUnit)
        });

        // Barometer
        items.push({
            title: 'Barometer',
            subtitle: helpers.formatBarometer(data.barometer)
        });

        // Dewpoint
        items.push({
            title: 'Dewpoint',
            subtitle: helpers.formatTempDisplay(data.dewpoint, preferredUnit, showBoth)
        });

        // Visibility
        items.push({
            title: 'Visibility',
            subtitle: helpers.formatVisibility(data.visibility)
        });

        // Last Update
        items.push({
            title: 'Last Update',
            subtitle: helpers.formatDateTime(data.observationTime)
        });

        return items;
    },

    /**
     * Show a message when no data is available
     * @private
     */
    _showNoData: function() {
        var card = new UI.Card({
            title: 'No Data',
            body: 'Weather data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = CurrentWeatherPage;
