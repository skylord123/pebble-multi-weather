/**
 * Multi Weather - Pebble Weather App
 *
 * Created by Skylord123 (https://skylar.tech)
 *
 * Entry point for the Multi Weather Pebble app.
 * Displays weather data from multiple providers (NWS, etc.)
 */

// === Core Imports ===
var UI = require('ui');
var Settings = require('settings');

// === Module Imports ===
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var SettingsManager = require('app/SettingsManager');
var WeatherManager = require('app/services/WeatherManager');

// === Page Imports ===
var MainMenuPage = require('app/pages/MainMenuPage');

// === Initialize AppState ===
var appState = AppState.getInstance();

// === Logging ===
helpers.log('App started! v' + Constants.appVersion);

// === Load Settings ===
SettingsManager.load();

// === Initialize Weather Manager ===
WeatherManager.init();

// === Settings Config Handler ===
SettingsManager.initConfigHandler({
    configPageUrl: Constants.CONFIG_PAGE_BASE_URL + Constants.CONFIG_PAGE_VERSION,
    onSettingsChanged: function() {
        helpers.log('Settings changed, refreshing weather');
        SettingsManager.load();
        MainMenuPage.refreshTheme();
        fetchLocationAndWeather();
    }
});

/**
 * Get current location via GPS and fetch weather
 */
function fetchLocationAndWeather() {
    var log = helpers.log;

    log('Getting GPS location...');

    var locationOptions = {
        enableHighAccuracy: true,
        maximumAge: 300000, // 5 minutes
        timeout: 15000
    };

    navigator.geolocation.getCurrentPosition(
        function(position) {
            log('GPS location: ' + position.coords.latitude + ', ' + position.coords.longitude);

            appState.latitude = position.coords.latitude;
            appState.longitude = position.coords.longitude;

            // Cache location for future app launches (for sun-based theme)
            SettingsManager.saveLocation(position.coords.latitude, position.coords.longitude);

            MainMenuPage.refreshTheme();
            refreshWeather();
        },
        function(error) {
            log('GPS error: ' + error.message);
            // Update menu to show error
            MainMenuPage.updateAll();
        },
        locationOptions
    );
}

/**
 * Refresh weather data from all providers
 */
function refreshWeather() {
    var log = helpers.log;

    if (!appState.hasLocation()) {
        log('No location available');
        MainMenuPage.updateAll();
        return;
    }

    log('Refreshing weather data...');

    WeatherManager.fetchAll(
        function() {
            log('All weather data loaded');
        },
        function(providerId, success) {
            log('Provider updated: ' + providerId + ' (success: ' + success + ')');
            MainMenuPage.updateProvider(providerId);
        }
    );
}

/**
 * Start the app
 */
function startApp() {
    var log = helpers.log;

    log('Starting app...');

    // Show main menu immediately with "Fetching..." subtitles
    MainMenuPage.show();

    // Get location and fetch weather
    fetchLocationAndWeather();
}

// === Auto-refresh Timer ===
setInterval(function() {
    helpers.log('Auto-refresh triggered');
    fetchLocationAndWeather();
}, 60000 * appState.refreshInterval);

// === Start App ===
startApp();
