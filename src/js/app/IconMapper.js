/**
 * IconMapper - Maps provider conditions to local icon resources
 *
 * Which condition a provider reports is worked out in app/Conditions; this
 * only picks the image resource for it.
 */

var Feature = require('platform/feature');
var ImageService = require('ui/imageservice');
var Conditions = require('app/Conditions');

var ICON_FILES = {
    sunny: { base: 'IMAGE_SUNNY', color: 'IMAGE_SUNNY_COLOR' },
    partlycloudy: { base: 'IMAGE_PARTLYCLOUDY', color: 'IMAGE_PARTLYCLOUDY_COLOR' },
    cloudy: { base: 'IMAGE_CLOUDY', color: 'IMAGE_CLOUDY_COLOR' },
    rain: { base: 'IMAGE_RAIN', color: 'IMAGE_RAIN_COLOR' },
    drizzle: { base: 'IMAGE_DRIZZLE', color: 'IMAGE_DRIZZLE_COLOR' },
    snow: { base: 'IMAGE_SNOW', color: 'IMAGE_SNOW_COLOR' },
    lightsnow: { base: 'IMAGE_LIGHTSNOW', color: 'IMAGE_LIGHTSNOW_COLOR' },
    mixedsnow: { base: 'IMAGE_MIXEDSNOW', color: 'IMAGE_MIXEDSNOW_COLOR' },
    hail: { base: 'IMAGE_HAIL', color: 'IMAGE_HAIL_COLOR' },
    storm: { base: 'IMAGE_STORM', color: 'IMAGE_STORM_COLOR' },
    thundershowers: { base: 'IMAGE_THUNDERSHOWERS', color: 'IMAGE_THUNDERSHOWERS_COLOR' },
    scatteredthunderstorms: { base: 'IMAGE_SCATTEREDTHUNDERSTORMS', color: 'IMAGE_SCATTEREDTHUNDERSTORMS_COLOR' },
    isolatedthunderstorms: { base: 'IMAGE_ISOLATEDTHUNDERSTORMS', color: 'IMAGE_ISOLATEDTHUNDERSTORMS_COLOR' },
    tornado: { base: 'IMAGE_TORNADO' },
    hurricane: { base: 'IMAGE_HURRICANE', color: 'IMAGE_HURRICANE_COLOR' },
    windy: { base: 'IMAGE_WINDY' },
    lowvisibility: { base: 'IMAGE_LOWVISIBILITY', color: 'IMAGE_LOWVISIBILITY_COLOR' },
    hot: { base: 'IMAGE_HOT', color: 'IMAGE_HOT_COLOR' },
    cold: { base: 'IMAGE_COLD', color: 'IMAGE_COLD_COLOR' },
    na: { base: 'IMAGE_NA' }
};

var IconMapper = {
    resolveIcon: function(key) {
        var entry = ICON_FILES[key] || ICON_FILES.na;
        var resource = entry.base;
        if (entry.color && Feature.color && Feature.color()) {
            resource = entry.color;
        }
        var resolved = ImageService.resolve(resource);
        console.log('[IconMapper] resolveIcon: key=' + key + ', resource=' + resource + ', resolved=' + resolved);
        return resolved;
    },

    getIconForProvider: function(providerId, weatherData) {
        return this.resolveIcon(Conditions.forWeather(providerId, weatherData));
    },

    getIconForOpenMeteo: function(code) {
        return this.resolveIcon(Conditions.openMeteo(code));
    },

    getIconForNws: function(iconUrl) {
        return this.resolveIcon(Conditions.nws(iconUrl));
    },

    getIconForMetNo: function(symbolCode) {
        return this.resolveIcon(Conditions.metNo(symbolCode));
    },

    getIconForOpenWeather: function(code) {
        return this.resolveIcon(Conditions.openWeather(code));
    },

    getIconForWeatherAPI: function(code) {
        return this.resolveIcon(Conditions.weatherApi(code));
    }
};

module.exports = IconMapper;
