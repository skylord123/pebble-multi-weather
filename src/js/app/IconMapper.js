/**
 * IconMapper - Maps provider conditions to local icon resources
 */

var Feature = require('platform/feature');
var ImageService = require('ui/imageservice');

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
        if (!weatherData) {
            return this.resolveIcon('na');
        }
        if (providerId === 'nws') {
            var iconUrl = weatherData.currentIconUrl;
            if (!iconUrl && weatherData.hourlyForecast && weatherData.hourlyForecast.periods &&
                weatherData.hourlyForecast.periods.length > 0) {
                iconUrl = weatherData.hourlyForecast.periods[0].icon;
            }
            if (!iconUrl && weatherData.forecastPeriods && weatherData.forecastPeriods.length > 0) {
                iconUrl = weatherData.forecastPeriods[0].icon;
            }
            return this.getIconForNws(iconUrl);
        }
        if (providerId === 'openmeteo') {
            var code = weatherData.currentWeatherCode;
            if ((code === null || code === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                code = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.getIconForOpenMeteo(code);
        }
        if (providerId === 'metno') {
            var symbolCode = weatherData.currentSymbolCode;
            if (!symbolCode && weatherData.hourlyForecast && weatherData.hourlyForecast.periods &&
                weatherData.hourlyForecast.periods.length > 0) {
                symbolCode = weatherData.hourlyForecast.periods[0].symbolCode;
            }
            if (!symbolCode && weatherData.forecastPeriods && weatherData.forecastPeriods.length > 0) {
                symbolCode = weatherData.forecastPeriods[0].symbolCode;
            }
            return this.getIconForMetNo(symbolCode);
        }
        return this.resolveIcon('na');
    },

    /**
     * Map Open-Meteo WMO weather codes to icons
     * Reference: https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c
     * WMO Code Table 4677
     */
    getIconForOpenMeteo: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return this.resolveIcon('na');
        }
        var value = Number(code);

        // Clear conditions (0-3)
        if (value === 0) return this.resolveIcon('sunny');           // Clear sky
        if (value === 1) return this.resolveIcon('sunny');           // Mainly clear (still mostly sunny)
        if (value === 2) return this.resolveIcon('partlycloudy');    // Partly cloudy
        if (value === 3) return this.resolveIcon('cloudy');          // Overcast

        // Fog (45, 48)
        if (value === 45) return this.resolveIcon('lowvisibility');  // Fog
        if (value === 48) return this.resolveIcon('lowvisibility');  // Depositing rime fog

        // Drizzle (51-57)
        if (value === 51) return this.resolveIcon('drizzle');        // Light drizzle
        if (value === 53) return this.resolveIcon('drizzle');        // Moderate drizzle
        if (value === 55) return this.resolveIcon('drizzle');        // Dense drizzle
        if (value === 56) return this.resolveIcon('mixedsnow');      // Light freezing drizzle
        if (value === 57) return this.resolveIcon('mixedsnow');      // Dense freezing drizzle

        // Rain (61-67)
        if (value === 61) return this.resolveIcon('drizzle');        // Slight rain
        if (value === 63) return this.resolveIcon('rain');           // Moderate rain
        if (value === 65) return this.resolveIcon('rain');           // Heavy rain
        if (value === 66) return this.resolveIcon('mixedsnow');      // Light freezing rain
        if (value === 67) return this.resolveIcon('mixedsnow');      // Heavy freezing rain

        // Snow (71-77)
        if (value === 71) return this.resolveIcon('lightsnow');      // Slight snow fall
        if (value === 73) return this.resolveIcon('snow');           // Moderate snow fall
        if (value === 75) return this.resolveIcon('snow');           // Heavy snow fall
        if (value === 77) return this.resolveIcon('lightsnow');      // Snow grains

        // Rain showers (80-82)
        if (value === 80) return this.resolveIcon('drizzle');        // Slight rain showers
        if (value === 81) return this.resolveIcon('rain');           // Moderate rain showers
        if (value === 82) return this.resolveIcon('rain');           // Violent rain showers

        // Snow showers (85-86)
        if (value === 85) return this.resolveIcon('lightsnow');      // Slight snow showers
        if (value === 86) return this.resolveIcon('snow');           // Heavy snow showers

        // Thunderstorm (95-99)
        if (value === 95) return this.resolveIcon('thundershowers'); // Thunderstorm
        if (value === 96) return this.resolveIcon('hail');           // Thunderstorm with slight hail
        if (value === 99) return this.resolveIcon('hail');           // Thunderstorm with heavy hail

        return this.resolveIcon('na');
    },

    getIconForNws: function(iconUrl) {
        if (!iconUrl || typeof iconUrl !== 'string') {
            return this.resolveIcon('na');
        }
        var cleaned = iconUrl.split('?')[0];
        var parts = cleaned.split('/');
        var name = parts[parts.length - 1] || '';
        name = name.split(',')[0].toLowerCase();

        if (name.indexOf('tornado') !== -1) return this.resolveIcon('tornado');
        if (name.indexOf('hurricane') !== -1 || name.indexOf('tropical') !== -1) return this.resolveIcon('hurricane');
        if (name.indexOf('hot') !== -1) return this.resolveIcon('hot');
        if (name.indexOf('cold') !== -1) return this.resolveIcon('cold');
        if (name.indexOf('wind') !== -1) return this.resolveIcon('windy');
        if (name.indexOf('fog') !== -1 || name.indexOf('haze') !== -1 || name.indexOf('smoke') !== -1 || name.indexOf('dust') !== -1 || name.indexOf('mist') !== -1) {
            return this.resolveIcon('lowvisibility');
        }
        if (name.indexOf('hail') !== -1) return this.resolveIcon('hail');
        if (name.indexOf('sleet') !== -1 || name.indexOf('ip') !== -1 || name.indexOf('fzra') !== -1 || name.indexOf('freezing') !== -1 || name.indexOf('ra_sn') !== -1 || name.indexOf('rain_snow') !== -1 || name.indexOf('mix') !== -1) {
            return this.resolveIcon('mixedsnow');
        }
        if (name.indexOf('tsra_sct') !== -1 || name.indexOf('scttsra') !== -1) return this.resolveIcon('scatteredthunderstorms');
        if (name.indexOf('tsra_hi') !== -1) return this.resolveIcon('storm');
        if (name.indexOf('tsra') !== -1 || name.indexOf('tstorm') !== -1 || name.indexOf('thunder') !== -1) return this.resolveIcon('thundershowers');
        if (name.indexOf('snow') !== -1 || name.indexOf('sn') !== -1) return this.resolveIcon('snow');
        if (name.indexOf('drizzle') !== -1) return this.resolveIcon('drizzle');
        if (name.indexOf('rain') !== -1 || name.indexOf('ra') !== -1 || name.indexOf('shra') !== -1 || name.indexOf('showers') !== -1) return this.resolveIcon('rain');
        if (name.indexOf('sct') !== -1 || name.indexOf('few') !== -1 || name.indexOf('partly') !== -1) return this.resolveIcon('partlycloudy');
        if (name.indexOf('bkn') !== -1 || name.indexOf('ovc') !== -1 || name.indexOf('cloudy') !== -1) return this.resolveIcon('cloudy');
        if (name.indexOf('skc') !== -1 || name.indexOf('clear') !== -1) return this.resolveIcon('sunny');

        return this.resolveIcon('na');
    },

    getIconForMetNo: function(symbolCode) {
        if (!symbolCode || typeof symbolCode !== 'string') {
            return this.resolveIcon('na');
        }
        var code = symbolCode.toLowerCase();

        if (code.indexOf('thunder') !== -1) return this.resolveIcon('thundershowers');
        if (code.indexOf('sleet') !== -1 || code.indexOf('snowandrain') !== -1 || code.indexOf('rainandsnow') !== -1) {
            return this.resolveIcon('mixedsnow');
        }
        if (code.indexOf('snow') !== -1) {
            if (code.indexOf('light') !== -1) return this.resolveIcon('lightsnow');
            return this.resolveIcon('snow');
        }
        if (code.indexOf('rain') !== -1) {
            if (code.indexOf('light') !== -1) return this.resolveIcon('drizzle');
            return this.resolveIcon('rain');
        }
        if (code.indexOf('fog') !== -1) return this.resolveIcon('lowvisibility');
        if (code.indexOf('cloudy') !== -1) return this.resolveIcon('cloudy');
        if (code.indexOf('partlycloudy') !== -1) return this.resolveIcon('partlycloudy');
        if (code.indexOf('fair') !== -1 || code.indexOf('clearsky') !== -1) return this.resolveIcon('sunny');

        return this.resolveIcon('na');
    }
};

module.exports = IconMapper;
