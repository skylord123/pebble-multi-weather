/**
 * Sources - The weather/location and weather/hour envelopes
 *
 * Property names and shapes follow the phone's built-in weather plugin, so a
 * watchface written for one works with the other: name, temperature,
 * feels_like, high, low, condition, condition_code and precipitation. What
 * the built-in plugin cannot offer comes as extra properties: place,
 * provider, humidity, wind and updated on a location; time and precipitation
 * on an hour.
 *
 * A location instance is one provider, so `name` is the provider: it is what
 * tells the instances apart in a plugin picker. The place it is for, where
 * the provider names one, is `place`.
 */

var Constants = require('app/Constants');
var helpers = require('app/helpers');
var Glyphs = require('plugin/Glyphs');

// The app's condition keys onto the shared condition_code vocabulary, which
// consumers ship artwork for and which has no words for wind, fog or ice
var CONDITION_CODES = {
    sunny: 'sun',
    hot: 'sun',
    partlycloudy: 'partly_cloudy',
    cloudy: 'cloudy',
    lowvisibility: 'cloudy',
    drizzle: 'light_rain',
    rain: 'heavy_rain',
    thundershowers: 'heavy_rain',
    scatteredthunderstorms: 'heavy_rain',
    isolatedthunderstorms: 'heavy_rain',
    storm: 'heavy_rain',
    hurricane: 'heavy_rain',
    tornado: 'heavy_rain',
    lightsnow: 'light_snow',
    snow: 'heavy_snow',
    mixedsnow: 'rain_and_snow',
    hail: 'rain_and_snow',
    windy: 'unknown',
    cold: 'unknown',
    na: 'unknown'
};

var CONDITION_NAMES = {
    // Day or night: the providers' clear sky is not always a sunny one
    sunny: 'Clear',
    hot: 'Hot',
    partlycloudy: 'Partly cloudy',
    cloudy: 'Cloudy',
    lowvisibility: 'Fog',
    drizzle: 'Light rain',
    rain: 'Rain',
    thundershowers: 'Thunderstorms',
    scatteredthunderstorms: 'Scattered storms',
    isolatedthunderstorms: 'Isolated storms',
    storm: 'Storms',
    hurricane: 'Hurricane',
    tornado: 'Tornado',
    lightsnow: 'Light snow',
    snow: 'Snow',
    mixedsnow: 'Sleet',
    hail: 'Hail',
    windy: 'Windy',
    cold: 'Cold',
    na: 'Unknown'
};

// As many hours as the built-in plugin serves
var HOURS = 6;

function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

function round1(value) {
    return Math.round(value * 10) / 10;
}

function text(value) {
    return { text: String(value) };
}

/**
 * The units the user picked in Multi Weather
 * @param {Function} option - Reads an option by name
 */
function unitsFrom(option) {
    return {
        temperature: option('temperature_unit') === Constants.units.CELSIUS ? 'C' : 'F',
        speed: option('speed_unit') === Constants.speedUnits.KMH ? 'kmh' : 'mph',
        time: option('time_format') === Constants.timeFormats.HOUR_24 ? '24h' : '12h'
    };
}

function temperatureShapes(tempF, units, withLongText) {
    var value = units.temperature === 'C' ? helpers.fahrenheitToCelsius(tempF) : tempF;
    var label = Math.round(value) + '°' + units.temperature;
    var shapes = {
        shortText: text(label),
        numericValue: { value: round1(value), unit: '°' + units.temperature }
    };
    if (withLongText) {
        shapes.longText = text(label);
    }
    return shapes;
}

function percentShapes(percent) {
    return {
        numericValue: { value: percent, unit: '%', min: 0, max: 100 },
        shortText: text(Math.round(percent) + '%')
    };
}

function conditionShapes(key, providerText, iconPixelSize) {
    var shapes = { shortText: text(CONDITION_NAMES[key] || CONDITION_NAMES.na) };
    shapes.longText = text(providerText || CONDITION_NAMES[key] || CONDITION_NAMES.na);
    if (iconPixelSize) {
        var glyphs = Glyphs.shapes(key, iconPixelSize);
        shapes.icon = glyphs.icon;
        shapes.image = glyphs.image;
    }
    return shapes;
}

function conditionCode(key) {
    return { longText: text(CONDITION_CODES[key] || 'unknown') };
}

function hourLabel(time, units) {
    var hours = new Date(time).getHours();
    if (units.time === '24h') {
        return (hours < 10 ? '0' : '') + hours + ':00';
    }
    return (hours % 12 || 12) + (hours < 12 ? ' AM' : ' PM');
}

function providerShapes(providerId) {
    var provider = Constants.providers[providerId] || {};
    return {
        shortText: text(provider.name || providerId),
        longText: text(provider.fullName || provider.name || providerId)
    };
}

/** Whether a property is wanted: everything is, when the request names none */
function wants(request, property) {
    return !Array.isArray(request.properties) || request.properties.indexOf(property) !== -1;
}

var Sources = {
    CONDITION_CODES: CONDITION_CODES,
    HOURS: HOURS,
    unitsFrom: unitsFrom,

    /**
     * One weather/location instance for a provider's snapshot
     */
    location: function(view, units, request) {
        var p = {
            name: { shortText: text((Constants.providers[view.provider] || {}).name || view.provider) },
            provider: providerShapes(view.provider)
        };
        if (view.place) {
            p.place = { shortText: text(view.place), longText: text(view.place) };
        }
        if (isNumber(view.temp)) {
            p.temperature = temperatureShapes(view.temp, units, true);
        }
        if (isNumber(view.feelsLike)) {
            p.feels_like = temperatureShapes(view.feelsLike, units, true);
        }
        if (isNumber(view.high)) {
            p.high = temperatureShapes(view.high, units, true);
        }
        if (isNumber(view.low)) {
            p.low = temperatureShapes(view.low, units, true);
        }
        p.condition = conditionShapes(view.condition, view.text,
            wants(request, 'condition') ? request.iconPixelSize : null);
        p.condition_code = conditionCode(view.condition);
        if (isNumber(view.precipitation)) {
            p.precipitation = percentShapes(view.precipitation);
        }
        if (isNumber(view.humidity)) {
            p.humidity = percentShapes(view.humidity);
        }
        if (isNumber(view.windSpeed)) {
            var speed = units.speed === 'kmh' ? helpers.mphToKmh(view.windSpeed) : view.windSpeed;
            var unit = units.speed === 'kmh' ? 'km/h' : 'mph';
            var label = Math.round(speed) + ' ' + unit;
            p.wind = {
                shortText: text(label),
                longText: text(view.windDirection ? view.windDirection + ' ' + label : label),
                numericValue: { value: round1(speed), unit: unit }
            };
        }
        p.updated = { timestamp: { value: Math.floor((view.observedAt || view.fetchedAt) / 1000) } };

        return { instanceId: view.provider, properties: p };
    },

    /**
     * The weather/hour instances: the hours after this one, soonest first
     */
    hours: function(view, units, request, now) {
        var iconPixelSize = wants(request, 'condition') ? request.iconPixelSize : null;
        var thisHour = new Date(now);
        thisHour.setMinutes(0, 0, 0);
        var ahead = view.hours.filter(function(hour) {
            return hour.time > thisHour.getTime();
        }).slice(0, HOURS);

        return ahead.map(function(hour, index) {
            var p = {
                time: { timestamp: { value: Math.floor(hour.time / 1000) }, shortText: text(hourLabel(hour.time, units)) },
                condition: conditionShapes(hour.condition, hour.text, iconPixelSize),
                condition_code: conditionCode(hour.condition),
                provider: providerShapes(view.provider)
            };
            if (isNumber(hour.temp)) {
                p.temperature = temperatureShapes(hour.temp, units, false);
            }
            if (isNumber(hour.precipitation)) {
                p.precipitation = percentShapes(hour.precipitation);
            }
            // Position, as the built-in plugin numbers them: the next hour is 0
            return { instanceId: String(index), properties: p };
        });
    }
};

module.exports = Sources;
