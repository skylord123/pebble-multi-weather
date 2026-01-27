/**
 * OpenMeteoMenuPage - Sub-menu for Open-Meteo weather provider
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

var OpenMeteoMenuPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('OpenMeteoMenuPage: Showing');

        var status = appState.getProviderStatus('openmeteo');
        if (status === 'error') {
            this._showError();
            return;
        }

        var weatherData = appState.getWeatherData('openmeteo');
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

        var currentIcon = IconMapper.getIconForProvider('openmeteo', weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Open-Meteo',
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
            body: 'Unable to load Open-Meteo data.\nPlease try again.'
        });
        card.show();
    },

    _onSelect: function(e) {
        var log = helpers.log;
        var itemId = e.item.id;

        log('OpenMeteoMenuPage: Selected ' + itemId);

        if (itemId === 'current') {
            CurrentWeatherPage.show('openmeteo');
        } else if (itemId === 'forecast') {
            DetailedForecastPage.show('openmeteo');
        } else if (itemId === 'precipitation') {
            PrecipitationGraphPage.show('openmeteo');
        } else if (itemId === 'temperature') {
            TemperatureGraphPage.show('openmeteo');
        } else if (itemId === 'humidity') {
            HumidityGraphPage.show('openmeteo');
        } else if (itemId === 'wind') {
            WindSpeedGraphPage.show('openmeteo');
        }
    }
};

module.exports = OpenMeteoMenuPage;
