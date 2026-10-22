/**
 * Forecasts - Each provider's weather, as the plugin serves it
 *
 * A plugin is started afresh for every request, so anything worth keeping
 * between requests goes in localStorage. For each provider this uses, in
 * order:
 *
 * 1. the plugin's own snapshot, while it is current for this place
 * 2. the watch app's cached weather, while that is current for this place
 * 3. a fresh fetch through the app's own service for the provider
 * 4. if the fetch fails, the last snapshot or app cache, up to MAX_STALE_MS
 *
 * The watch app's cache is only ever read (see plugin/settings). Snapshots
 * hold just what the plugin serves, in the app's units (°F, mph), so a
 * change of units on the watch applies without fetching again.
 */

var Constants = require('app/Constants');
var Conditions = require('app/Conditions');
var ProviderSettings = require('app/ProviderSettings');
var helpers = require('app/helpers');
var Settings = require('settings');
var ajax = require('lib/ajax');

var NWSService = require('app/services/NWSService');
var OpenMeteoService = require('app/services/OpenMeteoService');
var MetNoService = require('app/services/MetNoService');
var OpenWeatherService = require('app/services/OpenWeatherService');
var WeatherAPIService = require('app/services/WeatherAPIService');

var SNAPSHOT_PREFIX = 'plugin_forecast:';

// Old weather beats none when a provider cannot be reached, for a while
var MAX_STALE_MS = 6 * 60 * 60 * 1000;

// About 2km: close enough to share a forecast
var SAME_PLACE_DEGREES = 0.02;

var HOURS_KEPT = 24;

// Providers whose location is a place name; the others report a time zone
var NAMES_PLACE = { nws: true, weatherapi: true };

var SERVICES = {
    nws: NWSService,
    openmeteo: OpenMeteoService,
    metno: MetNoService,
    openweather: OpenWeatherService,
    weatherapi: WeatherAPIService
};

var services = {};

function service(providerId) {
    if (!services[providerId] && SERVICES[providerId]) {
        services[providerId] = new SERVICES[providerId]();
    }
    return services[providerId] || null;
}

function samePlace(a, b) {
    return !!(a && b) &&
        typeof a.latitude === 'number' && typeof b.latitude === 'number' &&
        Math.abs(a.latitude - b.latitude) <= SAME_PLACE_DEGREES &&
        Math.abs(a.longitude - b.longitude) <= SAME_PLACE_DEGREES;
}

function maxAgeMs(providerId) {
    var provider = Constants.providers[providerId];
    return ((provider && provider.cacheDuration) || Constants.defaultRefreshInterval) * 60 * 1000;
}

function number(value) {
    if (value === null || value === undefined || value === '') { return null; }
    var parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
}

function timeOf(value) {
    if (value === null || value === undefined) { return null; }
    var time = new Date(value).getTime();
    return isNaN(time) ? null : time;
}

/** A chance of precipitation, when the provider gives one as a percentage */
function chanceOf(precipitation) {
    if (!precipitation || typeof precipitation !== 'object') { return null; }
    if (precipitation.unitCode && String(precipitation.unitCode).indexOf('percent') === -1) { return null; }
    return number(precipitation.value);
}

/** A period's temperature in °F, whichever unit the provider gave it in */
function periodTempF(period) {
    var value = number(period.temperature);
    if (value !== null && period.temperatureUnit === 'C') {
        value = helpers.celsiusToFahrenheit(value);
    }
    return value;
}

/**
 * What it feels like, by the formulas NWS uses: wind chill when it is cold
 * and windy, heat index when it is hot, and the air temperature otherwise
 */
function feelsLikeF(tempF, humidity, windMph) {
    if (tempF === null) { return null; }
    if (tempF <= 50 && windMph !== null && windMph > 3) {
        var v = Math.pow(windMph, 0.16);
        return 35.74 + 0.6215 * tempF - 35.75 * v + 0.4275 * tempF * v;
    }
    if (tempF >= 80 && humidity !== null) {
        var t = tempF;
        var rh = humidity;
        var simple = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
        if (simple < 80) { return simple; }
        var hi = -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh -
            0.00683783 * t * t - 0.05481717 * rh * rh + 0.00122874 * t * t * rh +
            0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
        if (rh < 13 && t <= 112) {
            hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
        } else if (rh > 85 && t <= 87) {
            hi += ((rh - 85) / 10) * ((87 - t) / 5);
        }
        return hi;
    }
    return tempF;
}

/**
 * Boil a service's weather data down to what the plugin serves
 */
function snapshot(providerId, data, place, fetchedAt) {
    var hourly = (data.hourlyForecast && data.hourlyForecast.periods) || [];
    var firstPeriod = data.forecastPeriods && data.forecastPeriods[0];
    var since = fetchedAt - 60 * 60 * 1000;
    var hours = [];

    for (var i = 0; i < hourly.length && hours.length < HOURS_KEPT; i++) {
        var period = hourly[i];
        var time = timeOf(period.startTime);
        if (time === null || time < since) { continue; }
        hours.push({
            time: time,
            temp: periodTempF(period),
            condition: Conditions.forPeriod(providerId, period),
            text: period.shortForecast || null,
            precipitation: chanceOf(period.probabilityOfPrecipitation)
        });
    }

    var temp = number(data.currentTemp);
    var humidity = number(data.humidity);
    var wind = helpers.parseWindSpeed(data.windSpeed);
    var feels = feelsLikeF(temp, humidity, wind);

    return {
        provider: providerId,
        latitude: place.latitude,
        longitude: place.longitude,
        fetchedAt: fetchedAt,
        // MET Norway's terms: not to be asked again before this
        notBefore: number(data.expiresAt),
        observedAt: timeOf(data.observationTime),
        place: NAMES_PLACE[providerId] && data.location ? String(data.location) : null,
        temp: temp,
        feelsLike: feels === null ? null : Math.round(feels * 10) / 10,
        high: number(data.highTemp),
        low: number(data.lowTemp),
        humidity: humidity,
        windSpeed: wind,
        windDirection: data.windDirection || null,
        condition: Conditions.forWeather(providerId, data),
        text: data.conditions || (hourly[0] && hourly[0].shortForecast) || null,
        precipitation: chanceOf(firstPeriod && firstPeriod.probabilityOfPrecipitation),
        hours: hours
    };
}

function readSnapshot(providerId) {
    try {
        var stored = JSON.parse(localStorage.getItem(SNAPSHOT_PREFIX + providerId));
        return stored && typeof stored === 'object' && stored.fetchedAt ? stored : null;
    } catch (e) {
        return null;
    }
}

function writeSnapshot(view) {
    try {
        localStorage.setItem(SNAPSHOT_PREFIX + view.provider, JSON.stringify(view));
    } catch (e) {
        helpers.log('Plugin: could not keep ' + view.provider + ': ' + ((e && e.message) || e));
    }
}

/** The watch app's cached weather for a provider, as a snapshot, if it is for this place */
function fromAppCache(providerId, place) {
    var cached = Settings.option(Constants.cachePrefix + providerId);
    try {
        if (typeof cached === 'string') { cached = JSON.parse(cached); }
    } catch (e) {
        return null;
    }
    if (!cached || !cached.data || !cached.timestamp) { return null; }

    // Entries the app saved before it recorded their place fall back on its
    // last known location, which may be from a later fetch
    var appPlace = typeof cached.latitude === 'number' && typeof cached.longitude === 'number'
        ? { latitude: cached.latitude, longitude: cached.longitude }
        : { latitude: number(Settings.option('cached_latitude')), longitude: number(Settings.option('cached_longitude')) };
    if (!samePlace(appPlace, place)) { return null; }
    try {
        return snapshot(providerId, cached.data, appPlace, cached.timestamp);
    } catch (e) {
        helpers.log('Plugin: unreadable app cache for ' + providerId + ': ' + ((e && e.message) || e));
        return null;
    }
}

/** The newest of the plugin's snapshot and the app's cache, for this place */
function newestKnown(providerId, place) {
    var own = readSnapshot(providerId);
    if (own && !samePlace(own, place)) { own = null; }
    var app = fromAppCache(providerId, place);
    if (own && app) { return own.fetchedAt >= app.fetchedAt ? own : app; }
    return own || app;
}

var MAX_MESSAGE_LENGTH = 200;

/**
 * An error as the apps reading the plugin see it. The text can come from a
 * provider, so the user's API keys are taken out of it whatever it says.
 */
function describe(err) {
    var code = 'UNKNOWN';
    var message;
    if (err && err.isApiError) {
        code = err.type === 'RateLimited' ? 'RATE_LIMITED' : 'UNKNOWN';
        message = [err.title, err.detail].filter(Boolean).join(': ');
    } else {
        message = typeof err === 'string' ? err : 'The provider could not be reached';
    }

    for (var providerId in ProviderSettings.apiKeySettings) {
        var key = Settings.option(ProviderSettings.apiKeySettings[providerId]);
        if (typeof key === 'string' && key.length >= 4) {
            message = message.split(key).join('<api key>');
        }
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        message = message.slice(0, MAX_MESSAGE_LENGTH - 1) + '…';
    }
    return { code: code, message: message };
}

/**
 * Fetch a provider's weather. Settles exactly once: with the data, the
 * provider's error, or 'no answer' once no request is left in flight.
 */
function fetchProvider(providerId, place) {
    return new Promise(function(resolve) {
        var done = false;
        function finish(result) {
            if (done) { return; }
            done = true;
            resolve(result);
        }

        var weather = service(providerId);
        if (!weather) {
            finish({ error: { code: 'UNKNOWN', message: 'Unknown provider ' + providerId } });
            return;
        }

        ajax.onIdle(function() {
            finish({ error: { code: 'UNKNOWN', message: weather.getName() + ' did not answer' } });
        });

        try {
            weather.fetchWeather(place.latitude, place.longitude, function(data) {
                try {
                    finish({ view: snapshot(providerId, data, place, Date.now()) });
                } catch (e) {
                    finish({ error: { code: 'UNKNOWN', message: 'Unexpected data from ' + weather.getName() } });
                }
            }, function(err) {
                finish({ error: describe(err) });
            });
        } catch (e) {
            finish({ error: { code: 'UNKNOWN', message: String((e && e.message) || e) } });
        }
    });
}

var Forecasts = {
    /**
     * One provider's weather for a place
     * @param {string} providerId - Provider identifier
     * @param {Object} place - { latitude, longitude }
     * @returns {Promise} Resolves { view, stale } or { error: { code, message } }
     */
    get: function(providerId, place) {
        var known = newestKnown(providerId, place);
        if (known && (Date.now() - known.fetchedAt < maxAgeMs(providerId) || Date.now() < known.notBefore)) {
            return Promise.resolve({ view: known, stale: false });
        }

        return fetchProvider(providerId, place).then(function(result) {
            if (result.view) {
                writeSnapshot(result.view);
                return { view: result.view, stale: false };
            }
            helpers.log('Plugin: ' + providerId + ' failed: ' + result.error.message);
            if (known && Date.now() - known.fetchedAt < MAX_STALE_MS) {
                return { view: known, stale: true };
            }
            return result;
        });
    },

    /** When a view should be fetched again */
    expiresAt: function(view, stale) {
        var expiry = Math.max(view.fetchedAt + maxAgeMs(view.provider), view.notBefore || 0);
        // Stale means a fetch just failed: worth trying again soon, not at once
        var soonest = Date.now() + (stale ? 5 * 60 * 1000 : 60 * 1000);
        return Math.max(expiry, soonest);
    },

    // For tests
    _snapshot: snapshot,
    _feelsLikeF: feelsLikeF
};

module.exports = Forecasts;
