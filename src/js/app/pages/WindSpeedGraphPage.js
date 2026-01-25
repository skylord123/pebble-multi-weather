/**
 * WindSpeedGraphPage - Hourly wind speed graph
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var Graph = require('app/ui/Graph');
var HourlyValueListPage = require('app/pages/HourlyValueListPage');
var GraphNavigation = require('app/helpers/GraphNavigation');

var WindSpeedGraphPage = {
    graph: null,

    /**
     * Show the hourly wind speed graph for a provider
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('WindSpeedGraphPage: Showing for ' + providerId);

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

        var values = [];
        var preferredUnit = appState.speedUnit;
        for (var i = 0; i < periods.length; i++) {
            var speedMph = this._parseWindSpeed(periods[i].windSpeed);
            var value = speedMph;
            if (speedMph !== null && speedMph !== undefined && !isNaN(speedMph) &&
                preferredUnit === 'kmh') {
                value = helpers.mphToKmh(speedMph);
            }
            values.push(value);
        }

        var range = this._computeRange(values);
        var yTicks = this._buildTicks(range.min, range.max, 3);
        var providerName = GraphNavigation.getProviderName(providerId);

        this.graph = new Graph({
            title: preferredUnit === 'kmh' ? 'Wind Speed (kmh)' : 'Wind Speed (mph)',
            subtitle: providerName,
            values: values,
            valueMin: range.min,
            valueMax: range.max,
            yTicks: yTicks,
            yFormatter: function(value) {
                var unit = preferredUnit || 'mph';
                return Math.round(value) + ' ' + unit;
            },
            xLabels: this._buildXLabels(periods),
            lineColor: 'white',
            gridColor: 'darkGray',
            axisColor: 'white',
            labelColor: 'lightGray'
        });

        this.graph.window.on('click', 'select', function() {
            HourlyValueListPage.show({
                title: 'Wind Speed',
                periods: periods,
                valueTextForPeriod: function(period) {
                    var speed = period.windSpeed;
                    var parsed = WindSpeedGraphPage._parseWindSpeed(speed);
                    if (parsed === null || parsed === undefined || isNaN(parsed)) {
                        return '--';
                    }
                    if (preferredUnit === 'kmh') {
                        return Math.round(helpers.mphToKmh(parsed)) + ' kmh';
                    }
                    return Math.round(parsed) + ' mph';
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

    _parseWindSpeed: function(speed) {
        if (!speed) {
            return null;
        }
        if (typeof speed === 'number') {
            return speed;
        }
        var matches = speed.match(/[\d.]+/g);
        if (!matches || !matches.length) {
            return null;
        }
        var first = parseFloat(matches[0]);
        if (matches.length === 1) {
            return first;
        }
        var second = parseFloat(matches[1]);
        if (isNaN(first) || isNaN(second)) {
            return null;
        }
        return (first + second) / 2;
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
            body: 'Hourly wind speed data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = WindSpeedGraphPage;
