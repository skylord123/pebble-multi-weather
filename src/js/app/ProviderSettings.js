/**
 * ProviderSettings - Which weather providers are on, and in what order
 *
 * Worked out from the saved options alone, with no UI dependencies, so the
 * watch app and the plugin always agree on what the user picked.
 */

var Constants = require('app/Constants');

var ProviderSettings = {
    // The option each keyed provider keeps its API key in
    apiKeySettings: {
        openweather: 'openweather_api_key',
        weatherapi: 'weatherapi_api_key'
    },

    /**
     * Every provider id, in the saved order, followed by any provider the
     * saved order does not know about yet
     * @param {Array} savedOrder - The provider_order option
     * @returns {Array} Provider ids
     */
    order: function(savedOrder) {
        var defaultOrder = Constants.providerOrder;
        var ordered = [];
        if (Array.isArray(savedOrder)) {
            for (var i = 0; i < savedOrder.length; i++) {
                if (defaultOrder.indexOf(savedOrder[i]) !== -1 && ordered.indexOf(savedOrder[i]) === -1) {
                    ordered.push(savedOrder[i]);
                }
            }
        }
        for (var j = 0; j < defaultOrder.length; j++) {
            if (ordered.indexOf(defaultOrder[j]) === -1) {
                ordered.push(defaultOrder[j]);
            }
        }
        return ordered;
    },

    /**
     * Whether a provider is on. One left unset is on unless it needs an API
     * key, and one that needs a key is off for as long as it has none.
     * @param {string} providerId - Provider identifier
     * @param {Object} enabledMap - The provider_enabled option
     * @param {Function} option - Reads an option by name
     * @returns {boolean}
     */
    isEnabled: function(providerId, enabledMap, option) {
        var provider = Constants.providers[providerId];
        var enabled;
        if (enabledMap && typeof enabledMap === 'object' && enabledMap.hasOwnProperty(providerId)) {
            enabled = !!enabledMap[providerId];
        } else {
            enabled = !(provider && provider.requiresApiKey);
        }
        if (enabled && provider && provider.requiresApiKey) {
            var keySetting = this.apiKeySettings[providerId];
            enabled = !!(keySetting && option(keySetting));
        }
        return enabled;
    },

    /**
     * The providers that are on, in the user's order
     * @param {Function} option - Reads an option by name
     * @returns {Array} Provider ids
     */
    enabled: function(option) {
        var enabledMap = option('provider_enabled');
        var self = this;
        return this.order(option('provider_order')).filter(function(providerId) {
            return self.isEnabled(providerId, enabledMap, option);
        });
    }
};

module.exports = ProviderSettings;
