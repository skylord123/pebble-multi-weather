/**
 * settings - The watch app's options, read-only, for the plugin
 *
 * The plugin shares localStorage with the watch app's JS, so it reads the
 * options exactly where the app's Settings module keeps them. It never
 * writes them: the app holds its options in memory and writes the whole set
 * back on every change, so a write from here could be undone by the app, or
 * undo a change the user has just saved. The plugin keeps its own state
 * under keys of its own instead.
 */

var appinfo = require('appinfo');

var Settings = module.exports;

// The options carry the app's cached weather too, so they can be large, and
// a request reads several of them. One read serves them all for a moment.
var REUSE_MS = 2000;
var loaded = {};

function load(field) {
    var now = Date.now();
    var last = loaded[field];
    if (last && now - last.at < REUSE_MS) {
        return last.value;
    }
    var value;
    try {
        value = JSON.parse(localStorage.getItem(field + ':' + appinfo.uuid));
    } catch (e) {
        value = null;
    }
    value = (value && typeof value === 'object') ? value : {};
    loaded[field] = { at: now, value: value };
    return value;
}

function reader(field) {
    return function(name, value) {
        if (arguments.length > 1 || (name !== undefined && typeof name === 'object')) {
            console.warn('[MultiWeather] the plugin does not write ' + field);
            return undefined;
        }
        var stored = load(field);
        return arguments.length === 0 ? stored : stored[name];
    };
}

Settings.option = reader('options');
Settings.data = reader('data');
