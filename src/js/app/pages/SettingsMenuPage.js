/**
 * SettingsMenuPage - App settings menu
 */

var UI = require('ui');
var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var ProviderSettingsPage = require('app/pages/ProviderSettingsPage');
var QuickGlanceSettingsPage = require('app/pages/QuickGlanceSettingsPage');
var ForecastSubtitleSettingsPage = require('app/pages/ForecastSubtitleSettingsPage');
var MenuTheme = require('app/ui/MenuTheme');
var Touch = require('ui/touch');

var SettingsMenuPage = {
    menu: null,

    show: function() {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('SettingsMenuPage: Showing');

        var items = [
            {
                title: 'Providers',
                subtitle: 'Enable or disable',
                id: 'providers'
            },
            {
                title: 'Quick Glance',
                subtitle: this._formatQuickGlance(appState.quickGlance),
                id: 'quick_glance'
            },
            {
                title: 'Forecast Subtitle',
                subtitle: this._formatForecastSubtitle(appState.detailedForecastSubtitle),
                id: 'forecast_subtitle'
            },
            {
                title: 'Time Format',
                subtitle: this._formatTimeFormat(appState.timeFormat),
                id: 'time_format'
            },
            {
                title: 'Temp Unit',
                subtitle: this._formatUnit(appState.temperatureUnit),
                id: 'temp_unit'
            },
            {
                title: 'Speed Unit',
                subtitle: this._formatSpeedUnit(appState.speedUnit),
                id: 'speed_unit'
            },
            {
                title: 'Show both temperature units',
                subtitle: appState.temperatureShowBoth ? 'On' : 'Off',
                id: 'temp_both'
            },
            {
                title: 'Menu Background',
                subtitle: this._formatMenuBackground(appState.menuBackgroundMode),
                id: 'menu_background'
            }
        ];

        // Only show touch settings on watches with a touchscreen
        if (Touch.supported()) {
            items.push(this._touchItem());
        }

        var menuColors = MenuTheme.getMenuColors();
        this.menu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Settings',
                items: items
            }]
        });

        this.menu.on('select', function(e) {
            self._onSelect(e);
        });

        this.menu.show();
    },

    _onSelect: function(e) {
        var appState = AppState.getInstance();
        var itemId = e.item.id;

        if (itemId === 'providers') {
            ProviderSettingsPage.show();
            return;
        }

        if (itemId === 'temp_unit') {
            appState.temperatureUnit = (appState.temperatureUnit === Constants.units.CELSIUS)
                ? Constants.units.FAHRENHEIT
                : Constants.units.CELSIUS;
            Settings.option('temperature_unit', appState.temperatureUnit);
            this._updateItem(0, 4, {
                title: 'Temp Unit',
                subtitle: this._formatUnit(appState.temperatureUnit),
                id: 'temp_unit'
            });
            this._refreshMainMenu();
            return;
        }

        if (itemId === 'speed_unit') {
            appState.speedUnit = (appState.speedUnit === Constants.speedUnits.KMH)
                ? Constants.speedUnits.MPH
                : Constants.speedUnits.KMH;
            Settings.option('speed_unit', appState.speedUnit);
            this._updateItem(0, 5, {
                title: 'Speed Unit',
                subtitle: this._formatSpeedUnit(appState.speedUnit),
                id: 'speed_unit'
            });
            this._refreshMainMenu();
            return;
        }

        if (itemId === 'time_format') {
            appState.timeFormat = (appState.timeFormat === Constants.timeFormats.HOUR_24)
                ? Constants.timeFormats.HOUR_12
                : Constants.timeFormats.HOUR_24;
            Settings.option('time_format', appState.timeFormat);
            this._updateItem(0, 3, {
                title: 'Time Format',
                subtitle: this._formatTimeFormat(appState.timeFormat),
                id: 'time_format'
            });
            return;
        }

        if (itemId === 'quick_glance') {
            QuickGlanceSettingsPage.show();
            return;
        }

        if (itemId === 'forecast_subtitle') {
            ForecastSubtitleSettingsPage.show();
            return;
        }

        if (itemId === 'temp_both') {
            appState.temperatureShowBoth = !appState.temperatureShowBoth;
            Settings.option('temperature_show_both', appState.temperatureShowBoth);
            this._updateItem(0, 6, {
                title: 'Show both temperature units',
                subtitle: appState.temperatureShowBoth ? 'On' : 'Off',
                id: 'temp_both'
            });
            this._refreshMainMenu();
            return;
        }

        if (itemId === 'menu_background') {
            appState.menuBackgroundMode = this._nextMenuBackgroundMode(appState.menuBackgroundMode);
            Settings.option('menu_background_mode', appState.menuBackgroundMode);
            this._updateItem(0, 7, {
                title: 'Menu Background',
                subtitle: this._formatMenuBackground(appState.menuBackgroundMode),
                id: 'menu_background'
            });
            MenuTheme.applyToMenu(this.menu);
            MenuTheme.applyToMenu(appState.mainMenu);
            return;
        }

        if (itemId === 'touch') {
            this._showTouchSettings(e.itemIndex);
        }
    },

    _touchItem: function() {
        var appState = AppState.getInstance();
        return {
            title: 'Touch',
            subtitle: appState.touchEnabled ? 'Enabled' : 'Disabled',
            id: 'touch'
        };
    },

    /**
     * Touch input settings: turning touch off powers the digitizer down, and
     * long press actions can be turned off separately so touch is used for
     * navigation only
     */
    _showTouchSettings: function(itemIndex) {
        var self = this;
        var appState = AppState.getInstance();
        var menuColors = MenuTheme.getMenuColors();

        var touchMenu = new UI.Menu({
            status: false,
            backgroundColor: menuColors.backgroundColor,
            textColor: menuColors.textColor,
            highlightBackgroundColor: menuColors.highlightBackgroundColor,
            highlightTextColor: menuColors.highlightTextColor,
            sections: [{
                title: 'Touch'
            }]
        });

        function updateMenuItems() {
            touchMenu.items(0, [{
                title: 'Touch Input',
                subtitle: appState.touchEnabled ? 'Enabled' : 'Disabled',
                key: 'touch_enabled'
            }, {
                title: 'Long Press Actions',
                subtitle: !appState.touchEnabled ? 'Touch is disabled' :
                          (appState.touchLongPress ? 'Enabled' : 'Disabled'),
                key: 'touch_long_press'
            }]);
        }

        touchMenu.on('show', updateMenuItems);

        touchMenu.on('select', function(e) {
            if (e.item.key === 'touch_enabled') {
                appState.touchEnabled = !appState.touchEnabled;
                Settings.option('touch_enabled', appState.touchEnabled);
            } else if (appState.touchEnabled) {
                appState.touchLongPress = !appState.touchLongPress;
                Settings.option('touch_long_press', appState.touchLongPress);
            } else {
                return;
            }
            Touch.applySettings(appState.touchEnabled, appState.touchLongPress);
            updateMenuItems();
            self._updateItem(0, itemIndex, self._touchItem());
        });

        touchMenu.show();
    },

    _formatUnit: function(unit) {
        return unit === Constants.units.CELSIUS ? 'Celsius (C)' : 'Fahrenheit (F)';
    },

    _formatSpeedUnit: function(unit) {
        return unit === Constants.speedUnits.KMH ? 'Kilometers (kmh)' : 'Miles (mph)';
    },

    _formatTimeFormat: function(format) {
        return format === Constants.timeFormats.HOUR_24 ? '24-hour (17:00)' : '12-hour (5PM)';
    },

    _formatQuickGlance: function(value) {
        if (value === Constants.quickGlance.HUMIDITY) return 'Humidity';
        if (value === Constants.quickGlance.WIND) return 'Wind';
        if (value === Constants.quickGlance.FORECAST) return 'Forecast';
        if (value === Constants.quickGlance.CUSTOM_TEMPLATE) return 'Custom Template';
        return 'Temperature';
    },

    _formatForecastSubtitle: function(value) {
        if (value === Constants.detailedForecastSubtitle.LONG_FORECAST) return 'Long Forecast';
        if (value === Constants.detailedForecastSubtitle.SHORT_FORECAST_TEMP) return 'Short + High/Low';
        if (value === Constants.detailedForecastSubtitle.HIGH_LOW_TEMP) return 'High/Low Temp';
        if (value === Constants.detailedForecastSubtitle.WIND) return 'Wind';
        if (value === Constants.detailedForecastSubtitle.CUSTOM_TEMPLATE) return 'Custom Template';
        return 'Short Forecast';
    },

    updateQuickGlanceItem: function() {
        var appState = AppState.getInstance();
        this._updateItem(0, 1, {
            title: 'Quick Glance',
            subtitle: this._formatQuickGlance(appState.quickGlance),
            id: 'quick_glance'
        });
    },

    updateForecastSubtitleItem: function() {
        var appState = AppState.getInstance();
        this._updateItem(0, 2, {
            title: 'Forecast Subtitle',
            subtitle: this._formatForecastSubtitle(appState.detailedForecastSubtitle),
            id: 'forecast_subtitle'
        });
    },

    _formatMenuBackground: function(value) {
        if (value === Constants.menuBackgroundModes.BLACK) return 'Black';
        if (value === Constants.menuBackgroundModes.WHITE) return 'White';
        return 'Sun Based';
    },

    _nextMenuBackgroundMode: function(current) {
        if (current === Constants.menuBackgroundModes.SUN) {
            return Constants.menuBackgroundModes.BLACK;
        }
        if (current === Constants.menuBackgroundModes.BLACK) {
            return Constants.menuBackgroundModes.WHITE;
        }
        return Constants.menuBackgroundModes.SUN;
    },

    _updateItem: function(sectionIndex, itemIndex, item) {
        if (!this.menu) {
            return;
        }
        this.menu.item(sectionIndex, itemIndex, item);
    },

    _refreshMainMenu: function() {
        // Required here: MainMenuPage requires this page
        require('app/pages/MainMenuPage').rebuild();
    }
};

module.exports = SettingsMenuPage;
