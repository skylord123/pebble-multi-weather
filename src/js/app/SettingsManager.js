/**
 * SettingsManager - Handles loading and managing application settings
 */

var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

var SettingsManager = {
    /**
     * Load all settings from storage into AppState
     */
    load: function() {
        var appState = AppState.getInstance();
        var log = helpers.log;

        // Load cached location (for immediate sun-based theme calculation)
        var cachedLat = Settings.option('cached_latitude');
        var cachedLon = Settings.option('cached_longitude');
        if (cachedLat !== null && cachedLat !== undefined &&
            cachedLon !== null && cachedLon !== undefined &&
            !isNaN(cachedLat) && !isNaN(cachedLon)) {
            appState.latitude = cachedLat;
            appState.longitude = cachedLon;
            log('Loaded cached location: ' + cachedLat + ', ' + cachedLon);
        }

        // Temperature unit preference
        appState.temperatureUnit = Settings.option('temperature_unit') || Constants.defaultUnit;
        appState.temperatureShowBoth = Settings.option('temperature_show_both');
        if (appState.temperatureShowBoth === undefined || appState.temperatureShowBoth === null) {
            appState.temperatureShowBoth = true;
        }
        log('Temperature unit: ' + appState.temperatureUnit);

        // Speed unit preference
        appState.speedUnit = Settings.option('speed_unit') || Constants.speedUnits.MPH;
        log('Speed unit: ' + appState.speedUnit);

        // Time format preference
        appState.timeFormat = Settings.option('time_format') || Constants.defaultTimeFormat;
        log('Time format: ' + appState.timeFormat);

        // Quick glance preference (main menu subtitle)
        appState.quickGlance = Settings.option('quick_glance') || Constants.quickGlance.TEMPERATURE;
        log('Quick glance: ' + appState.quickGlance);

        // Custom template for quick glance
        appState.customTemplate = Settings.option('custom_template') || Constants.defaultCustomTemplate;
        log('Custom template: ' + appState.customTemplate);

        // Detailed forecast subtitle preference
        appState.detailedForecastSubtitle = Settings.option('detailed_forecast_subtitle') || Constants.detailedForecastSubtitle.SHORT_FORECAST;
        log('Detailed forecast subtitle: ' + appState.detailedForecastSubtitle);

        // Custom template for detailed forecast subtitle
        appState.detailedForecastSubtitleTemplate = Settings.option('detailed_forecast_subtitle_template') || Constants.defaultDetailedForecastSubtitleTemplate;
        log('Detailed forecast subtitle template: ' + appState.detailedForecastSubtitleTemplate);

        // OpenWeatherMap API key
        appState.openweatherApiKey = Settings.option('openweather_api_key') || '';
        log('OpenWeather API key configured: ' + (appState.openweatherApiKey ? 'Yes' : 'No'));

        // WeatherAPI.com API key
        appState.weatherapiApiKey = Settings.option('weatherapi_api_key') || '';
        log('WeatherAPI API key configured: ' + (appState.weatherapiApiKey ? 'Yes' : 'No'));

        // Menu background preference
        var menuBackgroundMode = Settings.option('menu_background_mode');
        if (menuBackgroundMode !== Constants.menuBackgroundModes.BLACK &&
            menuBackgroundMode !== Constants.menuBackgroundModes.WHITE &&
            menuBackgroundMode !== Constants.menuBackgroundModes.SUN) {
            menuBackgroundMode = Constants.menuBackgroundModes.SUN;
        }
        appState.menuBackgroundMode = menuBackgroundMode;
        log('Menu background mode: ' + appState.menuBackgroundMode);

        // Refresh interval in minutes
        appState.refreshInterval = Settings.option('refresh_interval');
        if (!appState.refreshInterval || isNaN(appState.refreshInterval)) {
            appState.refreshInterval = Constants.defaultRefreshInterval;
        }
        log('Refresh interval: ' + appState.refreshInterval + ' minutes');

        // Provider order and enabled list
        var savedOrder = Settings.option('provider_order');
        var savedEnabled = Settings.option('provider_enabled');
        var defaultOrder = Constants.providerOrder.slice();

        appState.providerEnabled = {};
        if (savedEnabled && typeof savedEnabled === 'object') {
            appState.providerEnabled = savedEnabled;
        }

        var orderedProviders = [];
        if (Array.isArray(savedOrder) && savedOrder.length) {
            for (var i = 0; i < savedOrder.length; i++) {
                if (defaultOrder.indexOf(savedOrder[i]) !== -1 && orderedProviders.indexOf(savedOrder[i]) === -1) {
                    orderedProviders.push(savedOrder[i]);
                }
            }
        }
        for (var j = 0; j < defaultOrder.length; j++) {
            if (orderedProviders.indexOf(defaultOrder[j]) === -1) {
                orderedProviders.push(defaultOrder[j]);
            }
        }

        appState.providerOrderAll = orderedProviders;
        appState.providerOrder = [];
        for (var k = 0; k < orderedProviders.length; k++) {
            var id = orderedProviders[k];
            var provider = Constants.providers[id];
            var isEnabled;

            // Check if provider is explicitly set in saved settings
            if (appState.providerEnabled && appState.providerEnabled.hasOwnProperty(id)) {
                isEnabled = !!appState.providerEnabled[id];
            } else {
                // Default: providers requiring API key are disabled by default, others enabled
                isEnabled = !(provider && provider.requiresApiKey);
            }

            // For providers requiring API key, also check if API key is actually configured
            if (isEnabled && provider && provider.requiresApiKey) {
                if (id === 'openweather' && !appState.openweatherApiKey) {
                    isEnabled = false;
                    log('OpenWeather disabled: no API key configured');
                }
                if (id === 'weatherapi' && !appState.weatherapiApiKey) {
                    isEnabled = false;
                    log('WeatherAPI disabled: no API key configured');
                }
            }

            if (isEnabled) {
                appState.providerOrder.push(id);
            }
        }
    },

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    get: function(key) {
        return Settings.option(key);
    },

    /**
     * Set a specific setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    set: function(key, value) {
        Settings.option(key, value);
    },

    /**
     * Save location to cache for future app launches
     * @param {number} latitude
     * @param {number} longitude
     */
    saveLocation: function(latitude, longitude) {
        Settings.option('cached_latitude', latitude);
        Settings.option('cached_longitude', longitude);
    },

    /**
     * Initialize the settings config page handler
     * @param {Object} options - Configuration options
     * @param {Function} options.onSettingsChanged - Callback when settings change
     */
    initConfigHandler: function(options) {
        var self = this;
        var log = helpers.log;

        Settings.config({
            url: options.configPageUrl || ''
        },
        function(e) {
            log('Settings page opened');
        },
        function(e) {
            log('Settings page closed');
            log('Returned settings: ' + JSON.stringify(e.options));
            Settings.option(e.options);

            if (e.failed) {
                log('Settings error: ' + e.response);
            }

            // Reload settings
            self.load();

            // Call the callback if provided
            if (options.onSettingsChanged) {
                options.onSettingsChanged();
            }
        });
    }
};

module.exports = SettingsManager;
