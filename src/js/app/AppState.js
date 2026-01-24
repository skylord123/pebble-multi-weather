/**
 * AppState - Singleton for managing global application state
 *
 * Stores weather data from all providers and app configuration.
 */

class AppState {
    constructor() {
        if (AppState._instance) {
            return AppState._instance;
        }
        AppState._instance = this;

        // Location settings
        this.latitude = null;
        this.longitude = null;

        // Weather data by provider
        this.weatherData = {};

        // Provider status tracking
        this.providerStatus = {};

        // UI references
        this.mainMenu = null;

        // App state
        this.isInitialized = false;
    }

    static getInstance() {
        return new AppState();
    }

    /**
     * Set weather data for a provider
     * @param {string} providerId - Provider identifier (e.g., 'nws')
     * @param {Object} data - Weather data object
     */
    setWeatherData(providerId, data) {
        this.weatherData[providerId] = data;
        this.providerStatus[providerId] = 'loaded';
    }

    /**
     * Get weather data for a provider
     * @param {string} providerId - Provider identifier
     * @returns {Object|null} Weather data or null
     */
    getWeatherData(providerId) {
        return this.weatherData[providerId] || null;
    }

    /**
     * Set provider status
     * @param {string} providerId - Provider identifier
     * @param {string} status - Status ('loading', 'loaded', 'error', 'unavailable')
     */
    setProviderStatus(providerId, status) {
        this.providerStatus[providerId] = status;
    }

    /**
     * Get provider status
     * @param {string} providerId - Provider identifier
     * @returns {string} Provider status
     */
    getProviderStatus(providerId) {
        return this.providerStatus[providerId] || 'unknown';
    }

    /**
     * Set provider error info
     * @param {string} providerId - Provider identifier
     * @param {Object} errorInfo - Error details {title, detail, type}
     */
    setProviderError(providerId, errorInfo) {
        if (!this.providerErrors) {
            this.providerErrors = {};
        }
        this.providerErrors[providerId] = errorInfo;
    }

    /**
     * Get provider error info
     * @param {string} providerId - Provider identifier
     * @returns {Object|null} Error info or null
     */
    getProviderError(providerId) {
        if (!this.providerErrors) {
            return null;
        }
        return this.providerErrors[providerId] || null;
    }

    /**
     * Check if location is configured
     * @returns {boolean}
     */
    hasLocation() {
        return this.latitude !== null && this.longitude !== null;
    }
}

var appState = AppState.getInstance();

module.exports = AppState;
