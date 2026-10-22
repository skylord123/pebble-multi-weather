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

// How long a provider has to answer a fetch, all its requests together (NWS
// makes up to five, some one after another)
var PROVIDER_TIMEOUT_MS = 60 * 1000;

var WeatherManager = {
    // Weather service instances
    services: {},

    // The newest fetch per provider, so an older one answering late is ignored
    requests: {},

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

        // A provider that said when its forecast is next updated is not asked
        // again before then, even for a forced refresh: MET Norway's terms
        // require it, and it would only answer with the same forecast
        var held = CacheManager.get(providerId);
        if (held && held.data && held.data.expiresAt && Date.now() < held.data.expiresAt &&
            CacheManager.isForPlace(held, appState.latitude, appState.longitude)) {
            appState.setWeatherData(providerId, held.data);
            log('WeatherManager: ' + providerId + ' not updated before ' + new Date(held.data.expiresAt));
            if (onSuccess) onSuccess(held.data);
            return;
        }

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            var cachedData = CacheManager.getIfValid(providerId, appState.latitude, appState.longitude);
            if (cachedData) {
                appState.setWeatherData(providerId, cachedData);
                log('WeatherManager: ' + providerId + ' loaded from cache');
                if (onSuccess) onSuccess(cachedData);
                return;
            }
        }

        log('WeatherManager: Fetching from ' + providerId);
        appState.setProviderStatus(providerId, 'loading');

        // Only the newest fetch for a provider counts: an older one answering
        // late must not overwrite fresher weather or the cache. And a fetch
        // that never answers, or whose answer could not be read, must not
        // leave the provider loading forever.
        var self = this;
        var request = (this.requests[providerId] || 0) + 1;
        this.requests[providerId] = request;
        var settled = false;
        function claim() {
            if (settled || self.requests[providerId] !== request) {
                return false;
            }
            settled = true;
            clearTimeout(watchdog);
            return true;
        }
        var watchdog = setTimeout(function() {
            if (!claim()) {
                return;
            }
            appState.setProviderStatus(providerId, 'error');
            appState.setProviderError(providerId, {
                title: 'No Answer',
                detail: service.getName() + ' did not answer. Long press to try again.',
                type: 'Timeout'
            });
            log('WeatherManager: ' + providerId + ' did not answer');
            if (onError) {
                onError('timeout');
            }
        }, PROVIDER_TIMEOUT_MS);

        // Where this fetch is for, which the location may have moved on from
        // by the time it answers
        var latitude = appState.latitude;
        var longitude = appState.longitude;

        service.fetchWeather(
            latitude,
            longitude,
            function(data) {
                if (!claim()) {
                    log('WeatherManager: ignoring an older answer from ' + providerId);
                    return;
                }
                appState.setWeatherData(providerId, data);
                appState.setProviderError(providerId, null); // Clear any previous error
                CacheManager.save(providerId, data, latitude, longitude);
                log('WeatherManager: ' + providerId + ' data received and cached');
                if (onSuccess) {
                    onSuccess(data);
                }
            },
            function(err) {
                if (!claim()) {
                    log('WeatherManager: ignoring an older failure from ' + providerId);
                    return;
                }
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
            return appState.locationFailed ? 'Location unavailable' : 'Getting location...';
        }

        if (status === 'unavailable') {
            return 'USA Only';
        }

        if (status === 'error') {
            return 'Error loading data';
        }

        if (status === 'loading' || !data) {
            return 'Fetching...';
        }

        if (service) {
            return service.getSummary(data, appState.temperatureUnit, appState.temperatureShowBoth, appState.speedUnit, appState.quickGlance, appState.customTemplate);
        }

        return 'Unknown';
    }
};

module.exports = WeatherManager;
