/**
 * NWSMenuPage - Sub-menu for NWS weather provider
 *
 * Shows options like "Current" conditions with weather summary.
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var WeatherManager = require('app/services/WeatherManager');
var CurrentWeatherPage = require('app/pages/CurrentWeatherPage');
var DetailedForecastPage = require('app/pages/DetailedForecastPage');
var PrecipitationGraphPage = require('app/pages/PrecipitationGraphPage');
var TemperatureGraphPage = require('app/pages/TemperatureGraphPage');
var HumidityGraphPage = require('app/pages/HumidityGraphPage');
var WindSpeedGraphPage = require('app/pages/WindSpeedGraphPage');
var IconMapper = require('app/IconMapper');
var MenuTheme = require('app/ui/MenuTheme');

var NWSMenuPage = {
    menu: null,

    /**
     * Show the NWS menu
     */
    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('NWSMenuPage: Showing');

        var status = appState.getProviderStatus('nws');

        // Check if provider is unavailable (e.g., outside USA)
        if (status === 'unavailable' || status === 'error') {
            this._showError();
            return;
        }

        var weatherData = appState.getWeatherData('nws');
        var subtitle = weatherData
            ? helpers.formatWeatherSummary(
                weatherData.currentTemp,
                weatherData.highTemp,
                weatherData.lowTemp,
                appState.temperatureUnit,
                appState.temperatureShowBoth
            )
            : 'No data';

        // Build forecast subtitle using the configured subtitle mode
        var forecastSubtitle = 'No forecast data';
        if (weatherData && weatherData.forecastPeriods && weatherData.forecastPeriods.length > 0) {
            forecastSubtitle = DetailedForecastPage.getSubtitleForPeriod(
                weatherData.forecastPeriods[0],
                weatherData.hourlyForecast,
                { weatherData: weatherData, periodIndex: 0 }
            );
        }

        var hourlyAvailable = !!(weatherData && weatherData.hourlyForecast &&
            weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0);
        var precipSubtitle = hourlyAvailable ? 'Next 24 hours' : 'No hourly data';
        var tempSubtitle = hourlyAvailable ? 'Next 24 hours' : 'No hourly data';
        var humiditySubtitle = hourlyAvailable ? 'Next 24 hours' : 'No hourly data';
        var windSubtitle = hourlyAvailable ? 'Next 24 hours' : 'No hourly data';

        var currentIcon = IconMapper.getIconForProvider('nws', weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'NWS Weather',
                items: [{
                    title: 'Current',
                    subtitle: subtitle,
                    id: 'current',
                    icon: currentIcon
                }, {
                    title: 'Detailed Forecast',
                    subtitle: forecastSubtitle,
                    id: 'forecast'
                }, {
                    title: 'Precipitation',
                    subtitle: precipSubtitle,
                    id: 'precipitation'
                }, {
                    title: 'Temperature',
                    subtitle: tempSubtitle,
                    id: 'temperature'
                }, {
                    title: 'Humidity',
                    subtitle: humiditySubtitle,
                    id: 'humidity'
                }, {
                    title: 'Wind Speed',
                    subtitle: windSubtitle,
                    id: 'wind'
                }]
            }]
        });

        this.menu.on('select', function(e) {
            self._onSelect(e);
        });

        this.menu.show();
    },

    /**
     * Show error card when provider is unavailable
     * @private
     */
    _showError: function() {
        var appState = AppState.getInstance();
        var errorInfo = appState.getProviderError('nws');
        var status = appState.getProviderStatus('nws');

        var title = 'USA Only';
        var body = 'NWS data is only available for locations within the United States.';

        if (errorInfo && errorInfo.title) {
            title = errorInfo.title;
        }

        if (errorInfo && errorInfo.detail) {
            body = errorInfo.detail;
        } else if (status === 'error') {
            title = 'Error';
            body = 'Unable to load weather data.\nPlease try again.';
        }

        var card = new UI.Card({
            title: title,
            body: body,
            scrollable: true
        });

        card.show();
    },

    /**
     * Handle menu item selection
     * @private
     */
    _onSelect: function(e) {
        var log = helpers.log;
        var itemId = e.item.id;

        log('NWSMenuPage: Selected ' + itemId);

        if (itemId === 'current') {
            CurrentWeatherPage.show('nws');
        } else if (itemId === 'forecast') {
            DetailedForecastPage.show('nws');
        } else if (itemId === 'precipitation') {
            PrecipitationGraphPage.show('nws');
        } else if (itemId === 'temperature') {
            TemperatureGraphPage.show('nws');
        } else if (itemId === 'humidity') {
            HumidityGraphPage.show('nws');
        } else if (itemId === 'wind') {
            WindSpeedGraphPage.show('nws');
        }
    }
};

module.exports = NWSMenuPage;
