/**
 * OpenWeatherMenuPage - Sub-menu for OpenWeatherMap weather provider
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

var OpenWeatherMenuPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('OpenWeatherMenuPage: Showing');

        var status = appState.getProviderStatus('openweather');
        var error = appState.getProviderError('openweather');

        if (status === 'error') {
            this._showError(error);
            return;
        }

        var weatherData = appState.getWeatherData('openweather');
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
                weatherData.hourlyForecast
            );
        }

        var hourlyAvailable = !!(weatherData && weatherData.hourlyForecast &&
            weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0);

        var hourlySubtitle = hourlyAvailable ? 'Next 48 hours' : 'No hourly data';

        var currentIcon = IconMapper.getIconForProvider('openweather', weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'OpenWeatherMap',
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

    _showError: function(error) {
        var title = 'Error';
        var body = 'Unable to load OpenWeatherMap data.\nPlease try again.';

        if (error) {
            if (error.type === 'MissingApiKey' || error.type === 'InvalidApiKey') {
                title = 'API Key Required';
                body = 'Please configure your OpenWeatherMap API key in the Mobile App settings.';
            } else if (error.title) {
                title = error.title;
                body = error.detail || body;
            }
        }

        var card = new UI.Card({
            title: title,
            body: body,
            scrollable: true
        });
        card.show();
    },

    _onSelect: function(e) {
        var log = helpers.log;
        var itemId = e.item.id;

        log('OpenWeatherMenuPage: Selected ' + itemId);

        if (itemId === 'current') {
            CurrentWeatherPage.show('openweather');
        } else if (itemId === 'forecast') {
            DetailedForecastPage.show('openweather');
        } else if (itemId === 'precipitation') {
            PrecipitationGraphPage.show('openweather');
        } else if (itemId === 'temperature') {
            TemperatureGraphPage.show('openweather');
        } else if (itemId === 'humidity') {
            HumidityGraphPage.show('openweather');
        } else if (itemId === 'wind') {
            WindSpeedGraphPage.show('openweather');
        }
    }
};

module.exports = OpenWeatherMenuPage;
