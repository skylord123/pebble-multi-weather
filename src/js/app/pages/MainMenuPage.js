/**
 * MainMenuPage - Main menu showing weather providers
 *
 * Displays a list of weather providers with current temperature
 * and high/low summary. Updates dynamically as weather data loads.
 */

var UI = require('ui');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var WeatherManager = require('app/services/WeatherManager');
var NWSMenuPage = require('app/pages/NWSMenuPage');
var OpenMeteoMenuPage = require('app/pages/OpenMeteoMenuPage');
var SettingsMenuPage = require('app/pages/SettingsMenuPage');
var MetNoMenuPage = require('app/pages/MetNoMenuPage');
var IconMapper = require('app/IconMapper');
var MenuTheme = require('app/ui/MenuTheme');

var MainMenuPage = {
    menu: null,

    /**
     * Show the main menu
     */
    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('MainMenuPage: Showing');

        // Build menu sections
        var sections = this._buildMenuSections();

        // Create or update the menu
        if (this.menu) {
            this.menu.hide();
        }

        var menuColors = MenuTheme.getMenuColors();
        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: sections
        });

        // Handle selection
        this.menu.on('select', function(e) {
            self._onSelect(e);
        });

        // Handle long select
        this.menu.on('longSelect', function(e) {
            self._onLongSelect(e);
        });

        this.menu.show();
        appState.mainMenu = this.menu;

        log('MainMenuPage: Menu displayed');
    },

    /**
     * Build menu sections from provider data
     * @private
     */
    _buildMenuSections: function() {
        var providerOrder = WeatherManager.getProviderOrder();
        var items = [];

        for (var i = 0; i < providerOrder.length; i++) {
            var providerId = providerOrder[i];
            var service = WeatherManager.getService(providerId);
            var data = AppState.getInstance().getWeatherData(providerId);

            if (service) {
                items.push({
                    title: service.getName(),
                    subtitle: WeatherManager.getProviderSummary(providerId),
                    providerId: providerId,
                    icon: IconMapper.getIconForProvider(providerId, data)
                });
            }
        }

        items.push({
            title: 'Settings',
            providerId: 'settings'
        });

        return [{
            title: 'Multi Weather',
            items: items
        }];
    },

    /**
     * Update a specific provider's menu item
     * @param {string} providerId - Provider to update
     */
    updateProvider: function(providerId) {
        var log = helpers.log;
        var appState = AppState.getInstance();

        if (!this.menu) {
            return;
        }

        var providerOrder = WeatherManager.getProviderOrder();
        var itemIndex = providerOrder.indexOf(providerId);

        if (itemIndex === -1) {
            return;
        }

        if (providerId === 'settings') {
            return;
        }

        var subtitle = WeatherManager.getProviderSummary(providerId);
        log('MainMenuPage: Updating ' + providerId + ' -> ' + subtitle);

        this.menu.item(0, itemIndex, {
            title: WeatherManager.getService(providerId).getName(),
            subtitle: subtitle,
            providerId: providerId,
            icon: IconMapper.getIconForProvider(providerId, appState.getWeatherData(providerId))
        });
    },

    /**
     * Update all provider menu items
     */
    updateAll: function() {
        var providerOrder = WeatherManager.getProviderOrder();

        for (var i = 0; i < providerOrder.length; i++) {
            this.updateProvider(providerOrder[i]);
        }
    },

    refreshTheme: function() {
        if (!this.menu) {
            return;
        }
        MenuTheme.applyToMenu(this.menu);
    },

    /**
     * Handle item selection
     * @private
     */
    _onSelect: function(e) {
        var log = helpers.log;
        var providerId = e.item.providerId;

        log('MainMenuPage: Selected ' + providerId);

        // Navigate to provider-specific menu
        if (providerId === 'settings') {
            SettingsMenuPage.show();
        } else if (providerId === 'nws') {
            NWSMenuPage.show();
        } else if (providerId === 'openmeteo') {
            OpenMeteoMenuPage.show();
        } else if (providerId === 'metno') {
            MetNoMenuPage.show();
        }
        // Future providers would have their own pages:
        // else if (providerId === 'openweather') { OpenWeatherMenuPage.show(); }
    },

    /**
     * Handle long press on item
     * @private
     */
    _onLongSelect: function(e) {
        var log = helpers.log;
        var providerId = e.item.providerId;
        if (providerId === 'settings') {
            return;
        }

        var itemIndex = e.itemIndex;

        log('MainMenuPage: Long press on ' + providerId);

        // Immediately show "Refreshing..." feedback
        this.menu.item(0, itemIndex, {
            title: WeatherManager.getService(providerId).getName(),
            subtitle: 'Refreshing...',
            providerId: providerId
        });

        // Force refresh data for this provider (skip cache)
        var self = this;
        WeatherManager.fetchFromProvider(providerId,
            function() {
                self.updateProvider(providerId);
            },
            function() {
                self.updateProvider(providerId);
            },
            true // forceRefresh
        );
    }
};

module.exports = MainMenuPage;
