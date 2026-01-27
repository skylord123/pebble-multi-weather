/**
 * PrecipitationGraphPage - Hourly precipitation chance graph
 */

var UI = require('ui');
var AppState = require('app/AppState');
var helpers = require('app/helpers');
var Graph = require('app/ui/Graph');
var HourlyValueListPage = require('app/pages/HourlyValueListPage');
var GraphNavigation = require('app/helpers/GraphNavigation');

var PrecipitationGraphPage = {
    graph: null,

    /**
     * Show the hourly precipitation graph for a provider
     * @param {string} providerId - Provider identifier
     */
    show: function(providerId) {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();

        log('PrecipitationGraphPage: Showing for ' + providerId);

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
            var pop = periods[i].probabilityOfPrecipitation;
            var value = (pop && pop.value !== null && pop.value !== undefined) ? Math.round(pop.value) : 0;
            values.push(this._clampPercent(value));
        }

        var xLabels = this._buildXLabels(periods);
        var providerName = GraphNavigation.getProviderName(providerId);

        this.graph = new Graph({
            title: 'Precipitation',
            subtitle: providerName,
            values: values,
            valueMin: 0,
            valueMax: 100,
            yTicks: [0, 50, 100],
            yFormatter: function(value) {
                return Math.round(value) + '%';
            },
            xLabels: xLabels,
            lineColor: 'white',
            gridColor: 'darkGray',
            axisColor: 'white',
            labelColor: 'lightGray'
        });

        this.graph.window.on('click', 'select', function() {
            HourlyValueListPage.show({
                title: 'Precipitation',
                periods: periods,
                valueTextForPeriod: function(period) {
                    var pop = period.probabilityOfPrecipitation;
                    var value = (pop && pop.value !== null && pop.value !== undefined)
                        ? Math.round(pop.value)
                        : null;
                    return (value === null || value === undefined || isNaN(value))
                        ? '--'
                        : value + '%';
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
                    text: helpers.formatHourForGraph(periods[idx].startTime)
                });
            }
        }
        return labels;
    },

    _clampPercent: function(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 0;
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
            body: 'Hourly precipitation data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = PrecipitationGraphPage;
