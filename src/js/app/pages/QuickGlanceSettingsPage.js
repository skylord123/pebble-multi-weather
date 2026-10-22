/**
 * QuickGlanceSettingsPage - Select quick glance subtitle
 */

var UI = require('ui');
var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var MenuTheme = require('app/ui/MenuTheme');

var QuickGlanceSettingsPage = {
    menu: null,

    show: function() {
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('QuickGlanceSettingsPage: Showing');

        var menuColors = MenuTheme.getMenuColors();
        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Quick Glance',
                items: this._buildItems(appState.quickGlance)
            }]
        });

        this.menu.on('select', this._onSelect.bind(this));

        this.menu.show();
    },

    _buildItems: function(selected) {
        return [
            this._makeItem(Constants.quickGlance.TEMPERATURE, 'Temperature', selected),
            this._makeItem(Constants.quickGlance.HUMIDITY, 'Humidity', selected),
            this._makeItem(Constants.quickGlance.WIND, 'Wind Speed', selected),
            this._makeItem(Constants.quickGlance.FORECAST, 'Forecast', selected),
            this._makeItem(Constants.quickGlance.CUSTOM_TEMPLATE, 'Custom Template', selected)
        ];
    },

    _makeItem: function(value, title, selected) {
        return {
            title: title,
            subtitle: value === selected ? 'Selected' : '',
            value: value
        };
    },

    _onSelect: function(e) {
        var appState = AppState.getInstance();
        var selected = e.item.value;

        if (!selected) {
            return;
        }

        appState.quickGlance = selected;
        Settings.option('quick_glance', selected);

        this._updateSelection(selected);
        this._refreshMainMenu();

        // Use late binding to avoid circular dependency
        var SettingsMenuPage = require('app/pages/SettingsMenuPage');
        if (SettingsMenuPage && SettingsMenuPage.updateQuickGlanceItem) {
            SettingsMenuPage.updateQuickGlanceItem();
        }
    },

    _updateSelection: function(selected) {
        if (!this.menu) {
            return;
        }
        var items = this._buildItems(selected);
        this.menu.items(0, items);
    },

    _refreshMainMenu: function() {
        // Required here: MainMenuPage requires this page
        require('app/pages/MainMenuPage').rebuild();
    }
};

module.exports = QuickGlanceSettingsPage;
