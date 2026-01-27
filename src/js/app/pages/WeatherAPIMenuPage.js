/**
 * WeatherAPIMenuPage - Sub-menu for WeatherAPI.com weather provider
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

var WeatherAPIMenuPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('WeatherAPIMenuPage: Showing');

        var status = appState.getProviderStatus('weatherapi');
        var error = appState.getProviderError('weatherapi');

        if (status === 'error') {
            this._showError(error);
            return;
        }

        var weatherData = appState.getWeatherData('weatherapi');
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

        var hourlySubtitle = hourlyAvailable ? 'Hourly forecast' : 'No hourly data';

        var currentIcon = IconMapper.getIconForProvider('weatherapi', weatherData);
        var menuColors = MenuTheme.getMenuColors();

        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'WeatherAPI.com',
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
        var body = 'Unable to load WeatherAPI.com data.\nPlease try again.';

        if (error) {
            if (error.type === 'MissingApiKey' || error.type === 'InvalidApiKey') {
                title = 'API Key Required';
                body = 'Please configure your WeatherAPI.com API key in the Mobile App settings.';
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

        log('WeatherAPIMenuPage: Selected ' + itemId);

        if (itemId === 'current') {
            CurrentWeatherPage.show('weatherapi');
        } else if (itemId === 'forecast') {
            DetailedForecastPage.show('weatherapi');
        } else if (itemId === 'precipitation') {
            PrecipitationGraphPage.show('weatherapi');
        } else if (itemId === 'temperature') {
            TemperatureGraphPage.show('weatherapi');
        } else if (itemId === 'humidity') {
            HumidityGraphPage.show('weatherapi');
        } else if (itemId === 'wind') {
            WindSpeedGraphPage.show('weatherapi');
        }
    }
};

module.exports = WeatherAPIMenuPage;
