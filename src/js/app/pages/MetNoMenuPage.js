/**
 * MetNoMenuPage - Sub-menu for Meteorologisk institutt provider
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var CurrentWeatherPage = require('app/pages/CurrentWeatherPage');
var DetailedForecastPage = require('app/pages/DetailedForecastPage');
var PrecipitationGraphPage = require('app/pages/PrecipitationGraphPage');
var TemperatureGraphPage = require('app/pages/TemperatureGraphPage');
var HumidityGraphPage = require('app/pages/HumidityGraphPage');
var WindSpeedGraphPage = require('app/pages/WindSpeedGraphPage');
var IconMapper = require('app/IconMapper');
var MenuTheme = require('app/ui/MenuTheme');

var MetNoMenuPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('MetNoMenuPage: Showing');

        var status = appState.getProviderStatus('metno');
        if (status === 'error') {
            this._showError();
            return;
        }

        var weatherData = appState.getWeatherData('metno');
        var subtitle = weatherData
            ? helpers.formatWeatherSummary(
                weatherData.currentTemp,
                weatherData.highTemp,
                weatherData.lowTemp,
                appState.temperatureUnit,
                appState.temperatureShowBoth
            )
            : 'No data';

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

        var hourlySubtitle = hourlyAvailable ? 'Next 24 hours' : 'No hourly data';

        var currentIcon = IconMapper.getIconForProvider('metno', weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Meteorologisk institutt',
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
                    subtitle: hourlySubtitle,
                    id: 'precipitation'
                }, {
                    title: 'Temperature',
                    subtitle: hourlySubtitle,
                    id: 'temperature'
                }, {
                    title: 'Humidity',
                    subtitle: hourlySubtitle,
                    id: 'humidity'
                }, {
                    title: 'Wind Speed',
                    subtitle: hourlySubtitle,
                    id: 'wind'
                }]
            }]
        });

        this.menu.on('select', function(e) {
            self._onSelect(e);
        });

        this.menu.show();
    },

    _showError: function() {
        var card = new UI.Card({
            title: 'Error',
            body: 'Unable to load MET Norway data.\nPlease try again.'
        });
        card.show();
    },

    _onSelect: function(e) {
        var log = helpers.log;
        var itemId = e.item.id;

        log('MetNoMenuPage: Selected ' + itemId);

        if (itemId === 'current') {
            CurrentWeatherPage.show('metno');
        } else if (itemId === 'forecast') {
            DetailedForecastPage.show('metno');
        } else if (itemId === 'precipitation') {
            PrecipitationGraphPage.show('metno');
        } else if (itemId === 'temperature') {
            TemperatureGraphPage.show('metno');
        } else if (itemId === 'humidity') {
            HumidityGraphPage.show('metno');
        } else if (itemId === 'wind') {
            WindSpeedGraphPage.show('metno');
        }
    }
};

module.exports = MetNoMenuPage;
