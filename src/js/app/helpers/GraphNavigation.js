/**
 * GraphNavigation - Helper for navigating between providers on graph pages
 */

var AppState = require('app/AppState');
var WeatherManager = require('app/services/WeatherManager');
var Constants = require('app/Constants');

var GraphNavigation = {
    /**
     * Get the display name for a provider
     * @param {string} providerId - Provider identifier
     * @returns {string} Provider display name
     */
    getProviderName: function(providerId) {
        var provider = Constants.providers[providerId];
        return provider ? provider.name : providerId;
    },

    /**
     * Check if a provider has valid hourly data
     * @param {string} providerId - Provider identifier
     * @returns {boolean} True if provider has hourly data
     */
    hasValidHourlyData: function(providerId) {
        var appState = AppState.getInstance();
        var status = appState.getProviderStatus(providerId);

        // Skip providers with errors or unavailable status
        if (status === 'error' || status === 'unavailable') {
            return false;
        }

        var weatherData = appState.getWeatherData(providerId);
        if (!weatherData || !weatherData.hourlyForecast || !weatherData.hourlyForecast.periods) {
            return false;
        }

        return weatherData.hourlyForecast.periods.length > 0;
    },

    /**
     * Get the next or previous provider that has valid hourly data
     * @param {string} currentProviderId - Current provider identifier
     * @param {string} direction - 'up' for previous, 'down' for next
     * @returns {string|null} Provider ID or null if none available
     */
    getAdjacentProvider: function(currentProviderId, direction) {
        var providerOrder = WeatherManager.getProviderOrder();
        var currentIndex = providerOrder.indexOf(currentProviderId);

        if (currentIndex === -1) {
            return null;
        }

        var step = (direction === 'up') ? -1 : 1;
        var nextIndex = currentIndex + step;

        // Search for a valid provider in the given direction
        while (nextIndex >= 0 && nextIndex < providerOrder.length) {
            var candidateId = providerOrder[nextIndex];
            if (this.hasValidHourlyData(candidateId)) {
                return candidateId;
            }
            nextIndex += step;
        }

        return null;
    },

    /**
     * Set up navigation handlers on a graph window
     * @param {Graph} graph - The graph instance
     * @param {string} currentProviderId - Current provider ID
     * @param {Function} showFunction - Function to call to show graph for a provider (receives providerId)
     */
    setupNavigation: function(graph, currentProviderId, showFunction) {
        var self = this;

        graph.window.on('click', 'up', function() {
            var prevProvider = self.getAdjacentProvider(currentProviderId, 'up');
            if (prevProvider) {
                graph.hide();
                showFunction(prevProvider);
            }
        });

        graph.window.on('click', 'down', function() {
            var nextProvider = self.getAdjacentProvider(currentProviderId, 'down');
            if (nextProvider) {
                graph.hide();
                showFunction(nextProvider);
            }
        });
    }
};

module.exports = GraphNavigation;
