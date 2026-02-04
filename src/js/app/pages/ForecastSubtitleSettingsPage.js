/**
 * ForecastSubtitleSettingsPage - Select detailed forecast subtitle display
 */

var UI = require('ui');
var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var MenuTheme = require('app/ui/MenuTheme');

var ForecastSubtitleSettingsPage = {
    menu: null,

    show: function() {
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('ForecastSubtitleSettingsPage: Showing');

        var menuColors = MenuTheme.getMenuColors();
        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Forecast Subtitle',
                items: this._buildItems(appState.detailedForecastSubtitle)
            }]
        });

        this.menu.on('select', this._onSelect.bind(this));

        this.menu.show();
    },

    _buildItems: function(selected) {
        return [
            this._makeItem(Constants.detailedForecastSubtitle.SHORT_FORECAST, 'Short Forecast', selected),
            this._makeItem(Constants.detailedForecastSubtitle.LONG_FORECAST, 'Long Forecast', selected),
            this._makeItem(Constants.detailedForecastSubtitle.SHORT_FORECAST_TEMP, 'Short + High/Low', selected),
            this._makeItem(Constants.detailedForecastSubtitle.HIGH_LOW_TEMP, 'High/Low Temp', selected),
            this._makeItem(Constants.detailedForecastSubtitle.WIND, 'Wind', selected),
            this._makeItem(Constants.detailedForecastSubtitle.CUSTOM_TEMPLATE, 'Custom Template', selected)
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

        appState.detailedForecastSubtitle = selected;
        Settings.option('detailed_forecast_subtitle', selected);

        this._updateSelection(selected);

        // Use late binding to avoid circular dependency
        var SettingsMenuPage = require('app/pages/SettingsMenuPage');
        if (SettingsMenuPage && SettingsMenuPage.updateForecastSubtitleItem) {
            SettingsMenuPage.updateForecastSubtitleItem();
        }
    },

    _updateSelection: function(selected) {
        if (!this.menu) {
            return;
        }
        var items = this._buildItems(selected);
        this.menu.items(0, items);
    }
};

module.exports = ForecastSubtitleSettingsPage;
