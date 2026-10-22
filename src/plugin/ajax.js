/**
 * ajax - lib/ajax for the plugin, on top of fetch
 *
 * The weather services call ajax(opt, success, failure) as they do in the
 * watch app's JS, but a plugin has no XMLHttpRequest, only fetch. This keeps
 * the same signature so the services run unchanged.
 *
 * A plugin has no timers either, so nothing can give up on a provider that
 * never calls back. Instead this counts the requests in flight: once none
 * are left, any provider still waiting is never going to hear back, and
 * onIdle tells the plugin so.
 */

var inFlight = 0;
var idleListeners = [];

function settled() {
    inFlight--;
    if (inFlight === 0) {
        var listeners = idleListeners.slice();
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]();
        }
    }
}

/**
 * Run a service's callback. One that throws is logged rather than allowed to
 * reject the fetch chain, where nobody would see it.
 */
function call(callback, body, status, response) {
    if (!callback) { return; }
    try {
        callback(body, status, response);
    } catch (err) {
        console.error('[MultiWeather] ajax callback threw: ' + ((err && err.stack) || err));
    }
}

function hostOf(url) {
    var match = /^[a-z]+:\/\/([^\/?#:]+)/i.exec(String(url));
    return match ? match[1] : 'the weather provider';
}

function encodeForm(data) {
    var params = [];
    for (var name in data) {
        if (data.hasOwnProperty(name)) {
            params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
        }
    }
    return params.join('&');
}

/**
 * @param {Object|string} opt - The URL, or { url, method, type, data, headers }
 * @param {Function} success - Called with (body, status, response) for a 2xx or 304
 * @param {Function} failure - Called with (body, status, response) otherwise; status 0 when the request never got an answer
 */
var ajax = function(opt, success, failure) {
    if (typeof opt === 'string') {
        opt = { url: opt };
    }

    var headers = {};
    if (opt.headers) {
        for (var name in opt.headers) {
            if (opt.headers.hasOwnProperty(name)) {
                headers[name] = opt.headers[name];
            }
        }
    }

    var init = { method: (opt.method || 'GET').toUpperCase(), headers: headers };
    if (opt.data) {
        if (opt.type === 'json') {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(opt.data);
        } else if (opt.type === 'text') {
            init.body = opt.data;
        } else {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            init.body = encodeForm(opt.data);
        }
    }

    inFlight++;
    var request;
    try {
        request = fetch(opt.url, init);
    } catch (err) {
        request = Promise.reject(err);
    }

    request.then(function(response) {
        return response.text().then(function(text) {
            var okay = response.ok || response.status === 304;
            var body = text;
            if (opt.type === 'json') {
                try {
                    body = JSON.parse(text);
                } catch (e) {
                    okay = false;
                }
            }
            call(okay ? success : failure, body, response.status, response);
        });
    }).catch(function() {
        // Blocked by the user's network permission, or no answer at all. The
        // error names the whole URL, and a URL can carry an API key, while
        // this message can end up with whichever app reads the plugin. The
        // host is all it needs.
        call(failure, 'Could not reach ' + hostOf(opt.url), 0, null);
    }).then(settled, settled);
};

/**
 * Run listener whenever the last request in flight has been answered and its
 * callback has returned
 */
ajax.onIdle = function(listener) {
    idleListeners.push(listener);
};

ajax.inFlight = function() {
    return inFlight;
};

module.exports = ajax;
