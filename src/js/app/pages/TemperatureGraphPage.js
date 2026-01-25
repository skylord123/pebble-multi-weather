/**
 * TemperatureGraphPage - Hourly temperature graph
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var Graph = require('app/ui/Graph');
var HourlyValueListPage = require('app/pages/HourlyValueListPage');
var GraphNavigation = require('app/helpers/GraphNavigation');

var TemperatureGraphPage = {
    graph: null,

    /**
     * Show the hourly temperature graph for a provider
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('TemperatureGraphPage: Showing for ' + providerId);

        var weatherData = appState.getWeatherData(providerId);
        if (!weatherData || !weatherData.hourlyForecast || !weatherData.hourlyForecast.periods) {
            this._showNoData();
            return;
        }

        var periods = weatherData.hourlyForecast.periods.slice(0, 24);
        if (!periods.length) {
            this._showNoData();
            return;
        }

        var preferredUnit = appState.temperatureUnit;
        var values = [];
        for (var i = 0; i < periods.length; i++) {
            var temp = periods[i].temperature;
            var value = this._toNumber(temp);
            if (value !== null && value !== undefined && !isNaN(value) &&
                preferredUnit === 'C') {
                value = helpers.fahrenheitToCelsius(value);
            }
            values.push(value);
        }

        var range = this._computeRange(values);
        var yTicks = this._buildTicks(range.min, range.max, 3);
        var providerName = GraphNavigation.getProviderName(providerId);

        this.graph = new Graph({
            title: 'Temperature',
            subtitle: providerName,
            values: values,
            valueMin: range.min,
            valueMax: range.max,
            yTicks: yTicks,
            yFormatter: function(value) {
                var unit = preferredUnit || 'F';
                return Math.round(value) + unit;
            },
            xLabels: this._buildXLabels(periods),
            lineColor: 'white',
            gridColor: 'darkGray',
            axisColor: 'white',
            labelColor: 'lightGray'
        });

        this.graph.window.on('click', 'select', function() {
            HourlyValueListPage.show({
                title: 'Temperature',
                periods: periods,
                valueTextForPeriod: function(period) {
                    var temp = period.temperature;
                    if (temp === null || temp === undefined || isNaN(temp)) {
                        return '--';
                    }
                    return helpers.formatTempDisplay(
                        temp,
                        preferredUnit,
                        appState.temperatureShowBoth
                    );
                }
            });
        });

        // Set up up/down navigation between providers
        GraphNavigation.setupNavigation(this.graph, providerId, function(newProviderId) {
            self.show(newProviderId);
        });

        this.graph.show();
    },

    _buildXLabels: function(periods) {
        var labels = [];
        var labelIndexes = [0, 6, 12, 18];
        for (var i = 0; i < labelIndexes.length; i++) {
            var idx = labelIndexes[i];
            if (periods[idx]) {
                labels.push({
                    index: idx,
                    text: this._formatHour(periods[idx].startTime)
                });
            }
        }
        return labels;
    },

    _formatHour: function(timestamp) {
        if (!timestamp) {
            return '--';
        }
        var date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return '--';
        }
        var hours = date.getHours();
        var suffix = hours >= 12 ? 'p' : 'a';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return hours + suffix;
    },

    _toNumber: function(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return Number(value);
    },

    _computeRange: function(values) {
        var min = null;
        var max = null;
        for (var i = 0; i < values.length; i++) {
            var value = values[i];
            if (value === null || value === undefined || isNaN(value)) {
                continue;
            }
            min = (min === null) ? value : Math.min(min, value);
            max = (max === null) ? value : Math.max(max, value);
        }
        if (min === null || max === null) {
            min = 0;
            max = 1;
        }
        if (min === max) {
            max = min + 1;
        }
        return { min: min, max: max };
    },

    _buildTicks: function(minValue, maxValue, count) {
        var ticks = [];
        if (count < 2) {
            return [minValue, maxValue];
        }
        var step = (maxValue - minValue) / (count - 1);
        for (var i = 0; i < count; i++) {
            ticks.push(minValue + step * i);
        }
        return ticks;
    },

    /**
     * Show a message when no data is available
     * @private
     */
    _showNoData: function() {
        var card = new UI.Card({
            title: 'No Hourly Data',
            body: 'Hourly temperature data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = TemperatureGraphPage;
