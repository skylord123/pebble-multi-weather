/**
 * Multi Weather plugin
 *
 * Serves the weather Multi Weather already knows how to fetch to any
 * watchface or app that reads the `weather` category: one weather/location
 * instance per provider switched on in Multi Weather, in the order of its
 * main menu, and weather/hour from the first of them with an hourly
 * forecast. The providers, API keys and units are the ones the user picked
 * in Multi Weather's settings.
 *
 * The phone starts this script for each request and stops it straight after
 * (see config/README.md for the plugin's protocol and limits).
 */

var ProviderSettings = require('app/ProviderSettings');
var Settings = require('settings');
var Forecasts = require('plugin/Forecasts');
var Sources = require('plugin/Sources');

var CATEGORY = 'weather';
var SOURCE_KEYS = ['weather/location', 'weather/hour'];

// A fix this old is still good enough for the weather
var LOCATION_MAX_AGE_MS = 15 * 60 * 1000;
var LOCATION_TIMEOUT_MS = 10 * 1000;
var PERMISSION_DENIED = 1;

function option(name) {
    return Settings.option(name);
}

/**
 * Where the phone is. When the phone cannot tell, where the watch app last
 * found itself, but never when the user has refused the location.
 */
function locate() {
    return new Promise(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(function(position) {
            resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }, function(error) {
            if (error && error.code === PERMISSION_DENIED) {
                reject({ code: 'PERMISSION_DENIED', message: 'Location access is off for Multi Weather' });
                return;
            }
            var latitude = Number(option('cached_latitude'));
            var longitude = Number(option('cached_longitude'));
            if (option('cached_latitude') !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
                resolve({ latitude: latitude, longitude: longitude });
                return;
            }
            reject({ code: 'PLUGIN_UNAVAILABLE', message: 'The phone could not find its location' });
        }, { maximumAge: LOCATION_MAX_AGE_MS, timeout: LOCATION_TIMEOUT_MS, enableHighAccuracy: false });
    });
}

/** The failure to report when no provider had anything to serve */
function firstError(results) {
    for (var i = 0; i < results.length; i++) {
        if (results[i].error) { return results[i].error; }
    }
    return { code: 'UNKNOWN', message: 'No weather available' };
}

function serveLocations(request, providers, place, units) {
    return Promise.all(providers.map(function(providerId) {
        return Forecasts.get(providerId, place);
    })).then(function(results) {
        var instances = [];
        var validUntil = null;
        results.forEach(function(result) {
            if (!result.view) { return; }
            instances.push(Sources.location(result.view, units, request));
            var expiry = Forecasts.expiresAt(result.view, result.stale);
            validUntil = validUntil === null ? expiry : Math.min(validUntil, expiry);
        });
        if (!instances.length) {
            throw firstError(results);
        }
        return { validUntilMs: validUntil, instances: instances };
    });
}

/** Providers are tried in the user's order until one has hours ahead */
function serveHours(request, providers, place, units) {
    var now = Date.now();
    var failures = [];

    function tryFrom(index) {
        if (index >= providers.length) {
            if (failures.length) { throw firstError(failures); }
            return { instances: [] };
        }
        return Forecasts.get(providers[index], place).then(function(result) {
            if (result.view) {
                var instances = Sources.hours(result.view, units, request, now);
                if (instances.length) {
                    return { validUntilMs: Forecasts.expiresAt(result.view, result.stale), instances: instances };
                }
            } else {
                failures.push(result);
            }
            return tryFrom(index + 1);
        });
    }

    return tryFrom(0);
}

Pebble.registerSourceHandler(function(request, respond) {
    if (request.category !== CATEGORY || (request.item !== 'location' && request.item !== 'hour')) {
        respond.error('INVALID_REQUEST', 'Multi Weather serves weather/location and weather/hour');
        return undefined;
    }

    var providers = ProviderSettings.enabled(option);
    if (!providers.length) {
        respond.error('PLUGIN_UNAVAILABLE', 'No weather providers are switched on in Multi Weather');
        return undefined;
    }
    var units = Sources.unitsFrom(option);

    return locate().then(function(place) {
        return request.item === 'hour'
            ? serveHours(request, providers, place, units)
            : serveLocations(request, providers, place, units);
    }).then(function(envelope) {
        respond.data(envelope);
    }, function(err) {
        var code = (err && err.code) || 'UNKNOWN';
        var message = (err && err.message) || String(err);
        console.log('[MultiWeather] plugin: ' + request.item + ' failed: ' + code + ' ' + message);
        respond.error(code, message);
    });
});

/**
 * The settings page asks for a refresh once it has saved, so anything
 * showing this plugin's weather picks up the new settings now rather than at
 * its next poll.
 */
Pebble.registerConfigHandler(function(message, respond) {
    if (message && message.type === 'refresh') {
        Pebble.refreshSources(SOURCE_KEYS);
        respond({ ok: true });
        return;
    }
    respond({ ok: false, error: { code: 'unknown_type', message: 'Unknown request type: ' + (message && message.type) } });
});
