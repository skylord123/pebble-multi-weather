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
var ConfigBridge = require('app/ConfigBridge');
var WeatherManager = require('app/services/WeatherManager');

// === Page Imports ===
var MainMenuPage = require('app/pages/MainMenuPage');
var NWSMenuPage = require('app/pages/NWSMenuPage');
var OpenMeteoMenuPage = require('app/pages/OpenMeteoMenuPage');
var MetNoMenuPage = require('app/pages/MetNoMenuPage');
var OpenWeatherMenuPage = require('app/pages/OpenWeatherMenuPage');
var WeatherAPIMenuPage = require('app/pages/WeatherAPIMenuPage');

// === Provider Menu Page Map ===
var providerMenuPages = {
    nws: NWSMenuPage,
    openmeteo: OpenMeteoMenuPage,
    metno: MetNoMenuPage,
    openweather: OpenWeatherMenuPage,
    weatherapi: WeatherAPIMenuPage
};

// === Initialize AppState ===
var appState = AppState.getInstance();

// === Logging ===
helpers.log('App started! v' + Constants.appVersion);

// === Load Settings ===
SettingsManager.load();

// === Initialize Weather Manager ===
WeatherManager.init();

// === Settings Config Handler ===
function onSettingsChanged() {
    helpers.log('Settings changed, refreshing weather');
    SettingsManager.load();
    // The providers shown, or their order, may have changed
    MainMenuPage.rebuild();
    MainMenuPage.refreshTheme();
    fetchLocationAndWeather();
}

/**
 * Redraw everything showing a provider after it has new data or an error
 */
function onProviderUpdated(providerId) {
    MainMenuPage.updateProvider(providerId);
    if (providerMenuPages[providerId]) {
        providerMenuPages[providerId].updateMenu();
    }
}

// The hosted page, opened by every phone app that does not know about pages
// bundled in the pbw
SettingsManager.initConfigHandler({
    configPageUrl: Constants.CONFIG_PAGE_BASE_URL + Constants.CONFIG_PAGE_VERSION,
    onSettingsChanged: onSettingsChanged
});

// The bundled page, which talks to this JS while it is open. Registers
// nothing on a phone app that cannot open one.
ConfigBridge.init({
    onSettingsChanged: onSettingsChanged,
    onProviderUpdated: onProviderUpdated
});

/**
 * Get current location via GPS and fetch weather
 * @param {boolean} forceRefresh - Fetch even where the cache is still valid
 */
function fetchLocationAndWeather(forceRefresh) {
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
            appState.locationFailed = false;

            // Cache location for future app launches (for sun-based theme)
            SettingsManager.saveLocation(position.coords.latitude, position.coords.longitude);

            MainMenuPage.refreshTheme();
            // An open config page can now test providers that need a location
            ConfigBridge.notifyStatus();
            refreshWeather(forceRefresh);
        },
        function(error) {
            log('GPS error: ' + error.message);
            ConfigBridge.notifyStatus();
            // The weather for the last place the phone found itself beats
            // none: SettingsManager.load already restored it
            if (appState.hasLocation()) {
                refreshWeather(forceRefresh);
                return;
            }
            appState.locationFailed = true;
            MainMenuPage.updateAll();
        },
        locationOptions
    );
}

/**
 * Refresh weather data from all providers
 * @param {boolean} forceRefresh - Fetch even where the cache is still valid
 */
function refreshWeather(forceRefresh) {
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
            onProviderUpdated(providerId);
            ConfigBridge.notifyStatus();
        },
        forceRefresh
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
// The cache lasts as long as the interval, and is stamped when the answer
// arrives, so a tick would usually find it still valid and fetch nothing
// until the tick after. The timer is the reason to fetch, so it always does.
setInterval(function() {
    helpers.log('Auto-refresh triggered');
    fetchLocationAndWeather(true);
}, 60000 * appState.refreshInterval);

// === Start App ===
startApp();
