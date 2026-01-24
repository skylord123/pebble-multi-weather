/**
 * CacheManager - Handles caching weather data to localStorage
 */

var Settings = require('settings');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

var CacheManager = {
    /**
     * Get cached weather data for a provider
     * @param {string} providerId - Provider identifier
     * @returns {Object|null} Cached data with timestamp, or null if not found/expired
     */
    get: function(providerId) {
        var log = helpers.log;
        var cacheKey = Constants.cachePrefix + providerId;
        var cached = Settings.option(cacheKey);

        if (!cached) {
            log('CacheManager: No cache for ' + providerId);
            return null;
        }

        // Parse if it's a string
        if (typeof cached === 'string') {
            try {
                cached = JSON.parse(cached);
            } catch (e) {
                log('CacheManager: Failed to parse cache for ' + providerId);
                return null;
            }
        }

        log('CacheManager: Found cache for ' + providerId);
        return cached;
    },

    /**
     * Check if cached data is still valid (not expired)
     * @param {string} providerId - Provider identifier
     * @returns {boolean} True if cache is valid
     */
    isValid: function(providerId) {
        var log = helpers.log;
        var cached = this.get(providerId);

        if (!cached || !cached.timestamp) {
            return false;
        }

        var provider = Constants.providers[providerId];
        var cacheDuration = (provider && provider.cacheDuration)
            ? provider.cacheDuration
            : Constants.defaultRefreshInterval;

        var ageMs = Date.now() - cached.timestamp;
        var maxAgeMs = cacheDuration * 60 * 1000;
        var isValid = ageMs < maxAgeMs;

        log('CacheManager: ' + providerId + ' cache age: ' +
            Math.round(ageMs / 1000) + 's, max: ' + (cacheDuration * 60) + 's, valid: ' + isValid);

        return isValid;
    },

    /**
     * Get cached data if valid, otherwise return null
     * @param {string} providerId - Provider identifier
     * @returns {Object|null} Weather data or null
     */
    getIfValid: function(providerId) {
        if (this.isValid(providerId)) {
            var cached = this.get(providerId);
            return cached ? cached.data : null;
        }
        return null;
    },

    /**
     * Save weather data to cache
     * @param {string} providerId - Provider identifier
     * @param {Object} data - Weather data to cache
     */
    save: function(providerId, data) {
        var log = helpers.log;
        var cacheKey = Constants.cachePrefix + providerId;

        var cacheEntry = {
            timestamp: Date.now(),
            data: data
        };

        Settings.option(cacheKey, JSON.stringify(cacheEntry));
        log('CacheManager: Saved cache for ' + providerId);
    },

    /**
     * Clear cache for a specific provider
     * @param {string} providerId - Provider identifier
     */
    clear: function(providerId) {
        var log = helpers.log;
        var cacheKey = Constants.cachePrefix + providerId;
        Settings.option(cacheKey, null);
        log('CacheManager: Cleared cache for ' + providerId);
    },

    /**
     * Clear all weather caches
     */
    clearAll: function() {
        var log = helpers.log;
        var providerOrder = Constants.providerOrder;

        for (var i = 0; i < providerOrder.length; i++) {
            this.clear(providerOrder[i]);
        }
        log('CacheManager: Cleared all caches');
    }
};

module.exports = CacheManager;
