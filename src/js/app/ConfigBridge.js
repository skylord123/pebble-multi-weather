/**
 * ConfigBridge - Live messaging with a settings page bundled in the pbw
 *
 * Newer Pebble phone apps can open a settings page shipped inside the pbw
 * (appinfo.json `configPage`) and let it talk to this JS while it is open:
 * the page calls `Pebble.sendMessage('pkjs', {...})`, which lands here as a
 * `configmessage` event, and this side can push at the page at any time with
 * `Pebble.sendConfigMessage({...})`.
 *
 * Older phone apps have neither, so nothing here registers unless the runtime
 * offers `Pebble.sendConfigMessage`. Those apps keep the classic flow: the
 * page is opened from the hosted URL in Constants, gets the settings in its
 * hash and hands them back through `pebblejs://close#`.
 *
 * Every request is `{ type: '...' }` plus its fields, and every reply is
 * `{ ok: true, ... }` or `{ ok: false, error: { code, message } }`. Pushes
 * from this side are `{ type: 'status', status }`. See config/README.md for
 * the whole protocol.
 */

var Settings = require('settings');
var AppState = require('app/AppState');
var Constants = require('app/Constants');
var helpers = require('app/helpers');

// Where a key is checked when the watch has no location yet. Only the key is
// being tested, and every provider answers for London.
var KEY_TEST_LOCATION = { latitude: 51.5074, longitude: -0.1278 };

// A provider that has not answered by now is reported as timed out, well
// inside the 30 seconds the phone waits for a reply
var TEST_TIMEOUT_MS = 20000;

// The setting each keyed provider keeps its API key in
var API_KEY_SETTINGS = {
    openweather: 'openweather_api_key',
    weatherapi: 'weatherapi_api_key'
};

var ConfigBridge = {
    // Set by init(): runs after a save so the app applies the new settings
    onSettingsChanged: null,
    // Set by init(): runs after a test has fetched fresh data for a provider
    onProviderUpdated: null,
    // Whether this runtime can talk to a bundled page at all
    available: false,
    statusTimer: null,

    /**
     * Register the configmessage handler if this phone app supports it
     * @param {Object} options
     * @param {Function} options.onSettingsChanged - Called after settings are saved
     * @param {Function} options.onProviderUpdated - Called with a provider id after a test fetched its weather
     */
    init: function(options) {
        var log = helpers.log;
        this.onSettingsChanged = options && options.onSettingsChanged;
        this.onProviderUpdated = options && options.onProviderUpdated;
        this.available = typeof Pebble.sendConfigMessage === 'function';

        if (!this.available) {
            log('Config bridge: not supported by this phone app, using the hosted config page');
            return;
        }

        var self = this;
        try {
            Pebble.addEventListener('configmessage', function(e) {
                self.handleMessage(e);
            });
            log('Config bridge: ready for a bundled config page');
        } catch (err) {
            this.available = false;
            log('Config bridge: could not register: ' + ((err && err.message) || err));
        }
    },

    /**
     * Dispatch one request from the page. Every path answers exactly once:
     * a request left unanswered makes the page wait on the host's timeout.
     */
    handleMessage: function(e) {
        var log = helpers.log;
        var message = (e && e.data && typeof e.data === 'object') ? e.data : {};
        var answered = false;

        function respond(reply) {
            if (answered) { return; }
            answered = true;
            try {
                e.respond(reply);
            } catch (err) {
                log('Config bridge: respond failed: ' + ((err && err.message) || err));
            }
        }

        function fail(code, text) {
            respond({ ok: false, error: { code: code, message: text } });
        }

        // Own keys only: a type like "constructor" must not find Object's
        var handler = Object.prototype.hasOwnProperty.call(ConfigBridge.handlers, message.type)
            ? ConfigBridge.handlers[message.type]
            : null;
        if (!handler) {
            fail('unknown_type', 'Unknown request type: ' + message.type);
            return;
        }

        log('Config bridge: ' + message.type);
        try {
            handler.call(this, message, respond, fail);
        } catch (err) {
            log('Config bridge: ' + message.type + ' threw: ' + ((err && err.stack) || err));
            fail('internal', 'The watch app hit an error: ' + ((err && err.message) || err));
        }
    },

    handlers: {
        /**
         * Everything the page needs to draw itself: the options (the same
         * ones the hosted page reads from its hash) plus how each provider is
         * doing.
         */
        get_settings: function(message, respond) {
            respond({
                ok: true,
                app_version: Constants.appVersion,
                conf_version: Constants.CONFIG_PAGE_VERSION.replace(/^v|\.html$/g, ''),
                settings: require('app/SettingsManager').pageOptions(),
                status: ConfigBridge.status()
            });
        },

        get_status: function(message, respond) {
            respond({ ok: true, status: ConfigBridge.status() });
        },

        /**
         * Persist a set of options and apply them, exactly as closing the
         * hosted page does. The page stays open, so this can happen more than
         * once a visit.
         */
        save_settings: function(message, respond, fail) {
            var settings = message.settings;
            if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
                fail('bad_request', 'save_settings needs a settings object');
                return;
            }

            ConfigBridge.applySettings(settings);
            respond({ ok: true });
        },

        /**
         * Try one provider. A keyed provider has its key checked, the one in
         * the request or else the saved one; a new key that works is saved
         * and the provider switched on, so a typo never replaces a working
         * key. A provider without a key fetches the weather where the watch
         * is, which also tells whether it covers that location.
         */
        test_provider: function(message, respond, fail) {
            var providerId = message.provider;
            if (!Object.prototype.hasOwnProperty.call(Constants.providers, providerId)) {
                fail('unknown_provider', 'Unknown provider: ' + providerId);
                return;
            }

            var WeatherManager = require('app/services/WeatherManager');
            var service = WeatherManager.getService(providerId);
            var provider = Constants.providers[providerId];
            var finish = ConfigBridge.withTimeout(respond, provider.fullName);

            if (provider.requiresApiKey) {
                ConfigBridge.testKey(providerId, service, message.api_key, finish, fail);
            } else {
                ConfigBridge.testFetch(providerId, WeatherManager, finish, fail);
            }
        }
    },

    testKey: function(providerId, service, requestedKey, finish, fail) {
        var settingName = API_KEY_SETTINGS[providerId];
        var isNewKey = typeof requestedKey === 'string';
        var apiKey = isNewKey ? requestedKey.trim() : (Settings.option(settingName) || '');
        if (!apiKey) {
            fail('missing_key', 'An API key is required');
            return;
        }

        var appState = AppState.getInstance();
        var where = appState.hasLocation()
            ? { latitude: appState.latitude, longitude: appState.longitude }
            : KEY_TEST_LOCATION;

        service.testApiKey(apiKey, where.latitude, where.longitude, function(result) {
            if (!result.ok || !isNewKey) {
                finish(result);
                return;
            }

            // This runs from the request's callback, outside the try/catch
            // around the handler, so it needs its own
            var saved = {};
            try {
                var enabled = Settings.option('provider_enabled');
                enabled = (enabled && typeof enabled === 'object') ? JSON.parse(JSON.stringify(enabled)) : {};
                enabled[providerId] = true;
                saved[settingName] = apiKey;
                saved.provider_enabled = enabled;
                ConfigBridge.applySettings(saved);
            } catch (err) {
                helpers.log('Config bridge: saving the key failed: ' + ((err && err.stack) || err));
                finish({ ok: false, error: { code: 'internal',
                    message: 'The key works, but the watch app failed to save it: ' +
                        ((err && err.message) || err) } });
                return;
            }
            finish({ ok: true, settings: saved });
        });
    },

    testFetch: function(providerId, WeatherManager, finish, fail) {
        var appState = AppState.getInstance();
        if (!appState.hasLocation()) {
            fail('no_location', 'The watch does not know where it is yet');
            return;
        }

        var self = this;
        WeatherManager.fetchFromProvider(providerId, function(data) {
            self.providerUpdated(providerId);
            finish({
                ok: true,
                location: (data && data.location) || null,
                summary: WeatherManager.getProviderSummary(providerId)
            });
        }, function(err) {
            self.providerUpdated(providerId);
            if (err && err.isApiError) {
                var unavailable = err.type && err.type.indexOf('InvalidPoint') !== -1;
                finish({ ok: false, error: {
                    code: unavailable ? 'unavailable' : 'provider_error',
                    message: unavailable
                        ? (err.detail || 'This provider does not cover your location')
                        : [err.title, err.detail].filter(Boolean).join(': ')
                } });
                return;
            }
            finish({ ok: false, error: { code: 'provider_error',
                message: typeof err === 'string' ? err : 'The provider could not be reached' } });
        }, true);
    },

    /**
     * A respond() that gives up on a provider that never answers, and
     * ignores it if it answers afterwards
     */
    withTimeout: function(respond, providerName) {
        var done = false;
        var timer = setTimeout(function() {
            done = true;
            respond({ ok: false, error: { code: 'timeout', message: providerName + ' did not answer in time' } });
        }, TEST_TIMEOUT_MS);
        return function(reply) {
            if (done) { return; }
            done = true;
            clearTimeout(timer);
            respond(reply);
        };
    },

    providerUpdated: function(providerId) {
        if (typeof this.onProviderUpdated === 'function') {
            this.onProviderUpdated(providerId);
        }
        this.notifyStatus();
    },

    /**
     * Merge options into the store and apply them
     */
    applySettings: function(settings) {
        var SettingsManager = require('app/SettingsManager');
        Settings.option(settings);
        SettingsManager.load();
        if (typeof this.onSettingsChanged === 'function') {
            this.onSettingsChanged();
        }
    },

    /**
     * Where the watch is and how each provider is doing, for the page's
     * status lines
     */
    status: function() {
        var appState = AppState.getInstance();
        var WeatherManager = require('app/services/WeatherManager');
        var providers = {};

        for (var id in Constants.providers) {
            if (!Constants.providers.hasOwnProperty(id)) { continue; }
            var state = appState.getProviderStatus(id);
            var error = appState.getProviderError(id);
            providers[id] = {
                enabled: (appState.providerOrder || []).indexOf(id) !== -1,
                state: state,
                error: error ? { title: error.title || null, detail: error.detail || null } : null,
                summary: state === 'loaded' ? WeatherManager.getProviderSummary(id) : null
            };
            if (API_KEY_SETTINGS[id]) {
                providers[id].has_key = !!Settings.option(API_KEY_SETTINGS[id]);
            }
        }

        return {
            has_location: appState.hasLocation(),
            providers: providers
        };
    },

    /**
     * Push the current status at the page, if one is open. Calls close
     * together are folded into one push; a push with no page open is dropped
     * by the phone, so this is safe to call from anywhere.
     */
    notifyStatus: function() {
        if (!this.available) { return; }
        var self = this;
        if (this.statusTimer) { clearTimeout(this.statusTimer); }
        this.statusTimer = setTimeout(function() {
            self.statusTimer = null;
            try {
                Pebble.sendConfigMessage({ type: 'status', status: self.status() });
            } catch (err) {
                helpers.log('Config bridge: push failed: ' + ((err && err.message) || err));
            }
        }, 150);
    }
};

module.exports = ConfigBridge;
