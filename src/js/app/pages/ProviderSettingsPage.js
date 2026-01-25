/**
 * ProviderSettingsPage - Enable/disable weather providers on watch
 */

var UI = require('ui');
var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var WeatherManager = require('app/services/WeatherManager');
var IconMapper = require('app/IconMapper');
var MenuTheme = require('app/ui/MenuTheme');

var ProviderSettingsPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('ProviderSettingsPage: Showing');

        var providerOrderAll = WeatherManager.getProviderOrderAll();
        var items = [];

        for (var i = 0; i < providerOrderAll.length; i++) {
            var providerId = providerOrderAll[i];
            var provider = Constants.providers[providerId];
            var enabled = self._isEnabled(providerId, appState);
            var subtitle = enabled ? 'Enabled' : 'Disabled';

            // Show special subtitle for providers requiring API key without one configured
            if (provider && provider.requiresApiKey) {
                var hasApiKey = self._hasApiKey(providerId, appState);
                if (!hasApiKey) {
                    subtitle = 'No API Key';
                }
            }

            items.push({
                title: provider ? provider.name : providerId,
                subtitle: subtitle,
                providerId: providerId
            });
        }

        var menuColors = MenuTheme.getMenuColors();
        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Providers',
                items: items
            }]
        });

        this.menu.on('select', function(e) {
            self._toggleProvider(e.item.providerId);
        });

        this.menu.show();
    },

    _isEnabled: function(providerId, appState) {
        var enabledMap = appState.providerEnabled || {};
        var provider = Constants.providers[providerId];

        if (enabledMap.hasOwnProperty(providerId)) {
            var enabled = !!enabledMap[providerId];
            // Even if marked enabled, check if API key is required but missing
            if (enabled && provider && provider.requiresApiKey) {
                if (!this._hasApiKey(providerId, appState)) {
                    return false;
                }
            }
            return enabled;
        }

        // Default: providers requiring API key are disabled by default
        if (provider && provider.requiresApiKey) {
            return false;
        }
        return true;
    },

    _hasApiKey: function(providerId, appState) {
        if (providerId === 'openweather') {
            return !!(appState.openweatherApiKey && appState.openweatherApiKey.length > 0);
        }
        return true;
    },

    _toggleProvider: function(providerId) {
        var self = this;
        var appState = AppState.getInstance();
        var enabledMap = appState.providerEnabled || {};
        var current = true;
        if (enabledMap.hasOwnProperty(providerId)) {
            current = !!enabledMap[providerId];
        }

        // Check if trying to enable OpenWeatherMap without API key
        if (providerId === 'openweather' && !current && !appState.openweatherApiKey) {
            this._showApiKeyError();
            return;
        }

        enabledMap[providerId] = !current;

        Settings.option('provider_enabled', enabledMap);
        appState.providerEnabled = enabledMap;

        // Recompute enabled provider order
        var orderedProviders = appState.providerOrderAll || Constants.providerOrder;
        appState.providerOrder = [];
        for (var i = 0; i < orderedProviders.length; i++) {
            var id = orderedProviders[i];
            var provider = Constants.providers[id];
            var isEnabled;

            if (enabledMap.hasOwnProperty(id)) {
                isEnabled = !!enabledMap[id];
            } else {
                // Default: providers requiring API key are disabled by default
                isEnabled = !(provider && provider.requiresApiKey);
            }

            // Also check if API key is required but missing
            if (isEnabled && provider && provider.requiresApiKey) {
                if (!this._hasApiKey(id, appState)) {
                    isEnabled = false;
                }
            }

            if (isEnabled) {
                appState.providerOrder.push(id);
            }
        }

        // Update menu UI
        var menuIndex = this._findMenuIndex(providerId);
        if (menuIndex !== -1) {
            this.menu.item(0, menuIndex, {
                title: Constants.providers[providerId].name,
                subtitle: enabledMap[providerId] ? 'Enabled' : 'Disabled',
                providerId: providerId
            });
        }

        // Refresh main menu with new enabled list
        this._refreshMainMenu();
    },

    _findMenuIndex: function(providerId) {
        if (!this.menu) {
            return -1;
        }
        var items = this.menu.items(0);
        for (var i = 0; i < items.length; i++) {
            if (items[i].providerId === providerId) {
                return i;
            }
        }
        return -1;
    },

    _refreshMainMenu: function() {
        var appState = AppState.getInstance();
        if (!appState.mainMenu) {
            return;
        }

        var providerOrder = WeatherManager.getProviderOrder();
        var items = [];

        for (var i = 0; i < providerOrder.length; i++) {
            var providerId = providerOrder[i];
            var service = WeatherManager.getService(providerId);
            if (service) {
                items.push({
                    title: service.getName(),
                    subtitle: WeatherManager.getProviderSummary(providerId),
                    providerId: providerId,
                    icon: IconMapper.getIconForProvider(providerId, appState.getWeatherData(providerId))
                });
            }
        }

        items.push({
            title: 'Settings',
            providerId: 'settings'
        });

        appState.mainMenu.items(0, items);
    },

    _showApiKeyError: function() {
        var card = new UI.Card({
            title: 'API Key Required',
            body: 'Please configure your OpenWeatherMap API key in the Mobile App settings for this Pebble app.',
            scrollable: true
        });
        card.show();
    }
};

module.exports = ProviderSettingsPage;
