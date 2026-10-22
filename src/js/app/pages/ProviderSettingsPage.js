/**
 * ProviderSettingsPage - Enable/disable weather providers on watch
 */

var UI = require('ui');
var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var WeatherManager = require('app/services/WeatherManager');
var SettingsManager = require('app/SettingsManager');
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
            items.push(self._item(providerOrderAll[i], appState));
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

    /**
     * A provider's row: on, off, or missing the API key it needs
     */
    _item: function(providerId, appState) {
        var provider = Constants.providers[providerId];
        var subtitle = this._isEnabled(providerId, appState) ? 'Enabled' : 'Disabled';
        if (provider && provider.requiresApiKey && !this._hasApiKey(providerId, appState)) {
            subtitle = 'No API Key';
        }
        return {
            title: provider ? provider.name : providerId,
            subtitle: subtitle,
            providerId: providerId
        };
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
            return !!appState.openweatherApiKey;
        }
        if (providerId === 'weatherapi') {
            return !!appState.weatherapiApiKey;
        }
        return true;
    },

    _toggleProvider: function(providerId) {
        var appState = AppState.getInstance();
        var provider = Constants.providers[providerId];
        // What the row shows, which for a provider never toggled is its
        // default: off when it needs an API key
        var current = this._isEnabled(providerId, appState);

        if (!current && provider && provider.requiresApiKey && !this._hasApiKey(providerId, appState)) {
            this._showApiKeyError(provider);
            return;
        }

        var enabledMap = {};
        var saved = appState.providerEnabled || {};
        for (var id in saved) {
            if (saved.hasOwnProperty(id)) {
                enabledMap[id] = saved[id];
            }
        }
        enabledMap[providerId] = !current;
        Settings.option('provider_enabled', enabledMap);

        // Works out the provider order again from what was just saved
        SettingsManager.load();

        var menuIndex = this._findMenuIndex(providerId);
        if (menuIndex !== -1) {
            this.menu.item(0, menuIndex, this._item(providerId, appState));
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
        // Required here: MainMenuPage requires this page
        require('app/pages/MainMenuPage').rebuild();
    },

    _showApiKeyError: function(provider) {
        var card = new UI.Card({
            title: 'API Key Required',
            body: 'Add your ' + provider.fullName + ' API key in Multi Weather\'s settings in the Pebble app on your phone.',
            scrollable: true
        });
        card.show();
    }
};

module.exports = ProviderSettingsPage;
