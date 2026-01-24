/**
 * HumidityGraphPage - Hourly relative humidity graph
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var Graph = require('app/ui/Graph');
var HourlyValueListPage = require('app/pages/HourlyValueListPage');

var HumidityGraphPage = {
    graph: null,

    /**
     * Show the hourly humidity graph for a provider
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('HumidityGraphPage: Showing for ' + providerId);

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
        for (var i = 0; i < periods.length; i++) {
            var humidity = periods[i].relativeHumidity;
            var value = (humidity && humidity.value !== null && humidity.value !== undefined)
                ? Math.round(humidity.value)
                : null;
            values.push(this._clampPercent(value));
        }

        this.graph = new Graph({
            title: 'Humidity',
            subtitle: 'Next 24 hours',
            values: values,
            valueMin: 0,
            valueMax: 100,
            yTicks: [0, 50, 100],
            yFormatter: function(value) {
                return Math.round(value) + '%';
            },
            xLabels: this._buildXLabels(periods),
            lineColor: 'white',
            gridColor: 'darkGray',
            axisColor: 'white',
            labelColor: 'lightGray'
        });

        this.graph.window.on('click', 'select', function() {
            HourlyValueListPage.show({
                title: 'Humidity',
                periods: periods,
                valueTextForPeriod: function(period) {
                    var humidity = period.relativeHumidity;
                    var value = (humidity && humidity.value !== null && humidity.value !== undefined)
                        ? Math.round(humidity.value)
                        : null;
                    return (value === null || value === undefined || isNaN(value))
                        ? '--'
                        : value + '%';
                }
            });
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

    _clampPercent: function(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        return Math.max(0, Math.min(100, value));
    },

    /**
     * Show a message when no data is available
     * @private
     */
    _showNoData: function() {
        var card = new UI.Card({
            title: 'No Hourly Data',
            body: 'Hourly humidity data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = HumidityGraphPage;
