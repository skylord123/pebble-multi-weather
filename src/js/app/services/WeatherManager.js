/**
 * WeatherManager - Coordinates weather data fetching from all providers
 *
 * Manages the collection of weather services and provides a unified
 * interface for fetching and accessing weather data.
 */

var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');
var NWSService = require('app/services/NWSService');
var OpenMeteoService = require('app/services/OpenMeteoService');
var MetNoService = require('app/services/MetNoService');
var OpenWeatherService = require('app/services/OpenWeatherService');
var WeatherAPIService = require('app/services/WeatherAPIService');
var CacheManager = require('app/services/CacheManager');

var WeatherManager = {
    // Weather service instances
    services: {},

    /**
     * Initialize all weather services
     */
    init: function() {
        var log = helpers.log;
        log('WeatherManager: Initializing services');

        // Initialize NWS service
        this.services.nws = new NWSService();
        this.services.openmeteo = new OpenMeteoService();
        this.services.metno = new MetNoService();
        this.services.openweather = new OpenWeatherService();
        this.services.weatherapi = new WeatherAPIService();
    },

    /**
     * Get a weather service by ID
     * @param {string} providerId - Provider identifier
     * @returns {WeatherService|null}
     */
    getService: function(providerId) {
        return this.services[providerId] || null;
    },

    /**
     * Get all registered services
     * @returns {Object} Map of service ID to service instance
     */
    getAllServices: function() {
        return this.services;
    },

    /**
     * Get list of provider IDs in display order
     * @returns {Array<string>}
     */
    getProviderOrder: function() {
        var appState = AppState.getInstance();
        if (appState.providerOrder && appState.providerOrder.length) {
            return appState.providerOrder;
        }
        return Constants.providerOrder;
    },

    /**
     * Get list of provider IDs in configured order (including disabled)
     * @returns {Array<string>}
     */
    getProviderOrderAll: function() {
        var appState = AppState.getInstance();
        if (appState.providerOrderAll && appState.providerOrderAll.length) {
            return appState.providerOrderAll;
        }
        return Constants.providerOrder;
    },

    /**
     * Load cached data for a provider if available and valid
     * @param {string} providerId - Provider identifier
     * @returns {boolean} True if cache was loaded
     */
    loadFromCache: function(providerId) {
        var appState = AppState.getInstance();
        var log = helpers.log;

        var cachedData = CacheManager.getIfValid(providerId);
        if (cachedData) {
            appState.setWeatherData(providerId, cachedData);
            log('WeatherManager: Loaded ' + providerId + ' from cache');
            return true;
        }
        return false;
    },

    /**
     * Fetch weather data from a specific provider
     * @param {string} providerId - Provider identifier
     * @param {Function} onSuccess - Callback with weather data
     * @param {Function} onError - Callback with error message
     * @param {boolean} forceRefresh - Skip cache and force fetch
     */
    fetchFromProvider: function(providerId, onSuccess, onError, forceRefresh) {
        var appState = AppState.getInstance();
        var log = helpers.log;
        var service = this.getService(providerId);

        if (!service) {
            if (onError) onError('Unknown provider: ' + providerId);
            return;
        }

        if (!appState.hasLocation()) {
            if (onError) onError('Location not configured');
            return;
        }

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            var cachedData = CacheManager.getIfValid(providerId);
            if (cachedData) {
                appState.setWeatherData(providerId, cachedData);
                log('WeatherManager: ' + providerId + ' loaded from cache');
                if (onSuccess) onSuccess(cachedData);
                return;
            }
        }

        log('WeatherManager: Fetching from ' + providerId);
        appState.setProviderStatus(providerId, 'loading');

        service.fetchWeather(
            appState.latitude,
            appState.longitude,
            function(data) {
                appState.setWeatherData(providerId, data);
                appState.setProviderError(providerId, null); // Clear any previous error
                CacheManager.save(providerId, data);
                log('WeatherManager: ' + providerId + ' data received and cached');
                if (onSuccess) {
                    onSuccess(data);
                }
            },
            function(err) {
                // Check if this is an API error with details (e.g., InvalidPoint)
                if (err && err.isApiError) {
                    var isUnavailable = err.type && err.type.indexOf('InvalidPoint') !== -1;
                    appState.setProviderStatus(providerId, isUnavailable ? 'unavailable' : 'error');
                    appState.setProviderError(providerId, {
                        title: err.title,
                        detail: err.detail,
                        type: err.type
                    });
                    log('WeatherManager: ' + providerId + ' API error - ' + err.title);
                } else {
                    appState.setProviderStatus(providerId, 'error');
                    appState.setProviderError(providerId, null);
                    log('WeatherManager: ' + providerId + ' error - ' + err);
                }
                if (onError) {
                    onError(err);
                }
            }
        );
    },

    /**
     * Fetch weather data from all providers
     * @param {Function} onComplete - Called when all providers finish (success or error)
     * @param {Function} onProviderUpdate - Called when each provider updates
     * @param {boolean} forceRefresh - Skip cache and force fetch
     */
    fetchAll: function(onComplete, onProviderUpdate, forceRefresh) {
        var self = this;
        var log = helpers.log;
        var appState = AppState.getInstance();
        var providerOrder = this.getProviderOrder();
        var remaining = providerOrder.length;

        if (!appState.hasLocation()) {
            log('WeatherManager: No location configured');
            if (onComplete) {
                onComplete();
            }
            return;
        }

        if (remaining === 0) {
            log('WeatherManager: No providers enabled');
            if (onComplete) {
                onComplete();
            }
            return;
        }

        log('WeatherManager: Fetching from ' + remaining + ' providers');

        function onProviderDone(providerId, success) {
            remaining--;
            if (onProviderUpdate) {
                onProviderUpdate(providerId, success);
            }
            if (remaining === 0 && onComplete) {
                onComplete();
            }
        }

        for (var i = 0; i < providerOrder.length; i++) {
            var providerId = providerOrder[i];
            (function(pid) {
                self.fetchFromProvider(pid,
                    function() { onProviderDone(pid, true); },
                    function() { onProviderDone(pid, false); },
                    forceRefresh
                );
            })(providerId);
        }
    },

    /**
     * Get weather summary for a provider (for menu display)
     * @param {string} providerId - Provider identifier
     * @returns {string} Summary string or loading/error message
     */
    getProviderSummary: function(providerId) {
        var appState = AppState.getInstance();
        var status = appState.getProviderStatus(providerId);
        var data = appState.getWeatherData(providerId);
        var service = this.getService(providerId);

        if (!appState.hasLocation()) {
            return 'Getting location...';
        }

        if (status === 'unavailable') {
            return 'USA Only';
        }

        if (status === 'loading' || !data) {
            return 'Fetching...';
        }

        if (status === 'error') {
            return 'Error loading data';
        }

        if (service) {
            return service.getSummary(data, appState.temperatureUnit, appState.temperatureShowBoth, appState.speedUnit, appState.quickGlance, appState.customTemplate);
        }

        return 'Unknown';
    }
};

module.exports = WeatherManager;
