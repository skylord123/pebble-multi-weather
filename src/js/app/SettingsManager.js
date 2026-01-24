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

        // Quick glance preference (main menu subtitle)
        appState.quickGlance = Settings.option('quick_glance') || Constants.quickGlance.TEMPERATURE;
        log('Quick glance: ' + appState.quickGlance);

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
            var isEnabled = true;
            if (appState.providerEnabled && appState.providerEnabled.hasOwnProperty(id)) {
                isEnabled = !!appState.providerEnabled[id];
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
