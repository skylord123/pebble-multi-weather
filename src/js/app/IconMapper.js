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
        if (providerId === 'openweather') {
            var owmCode = weatherData.currentWeatherCode;
            if ((owmCode === null || owmCode === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                owmCode = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.getIconForOpenWeather(owmCode);
        }
        if (providerId === 'weatherapi') {
            var waCode = weatherData.currentWeatherCode;
            if ((waCode === null || waCode === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                waCode = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.getIconForWeatherAPI(waCode);
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
    },

    /**
     * Map OpenWeatherMap weather condition codes to icons
     * Reference: https://openweathermap.org/weather-conditions
     *
     * Code ranges:
     * 2xx: Thunderstorm
     * 3xx: Drizzle
     * 5xx: Rain
     * 6xx: Snow
     * 7xx: Atmosphere
     * 800: Clear
     * 80x: Clouds
     */
    getIconForOpenWeather: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return this.resolveIcon('na');
        }
        var id = Number(code);

        // Thunderstorm (2xx)
        if (id >= 200 && id < 300) {
            if (id >= 200 && id <= 202) return this.resolveIcon('thundershowers');
            if (id >= 210 && id <= 221) return this.resolveIcon('storm');
            if (id >= 230 && id <= 232) return this.resolveIcon('thundershowers');
            return this.resolveIcon('thundershowers');
        }

        // Drizzle (3xx)
        if (id >= 300 && id < 400) {
            return this.resolveIcon('drizzle');
        }

        // Rain (5xx)
        if (id >= 500 && id < 600) {
            if (id === 500) return this.resolveIcon('drizzle');        // Light rain
            if (id === 511) return this.resolveIcon('mixedsnow');      // Freezing rain
            if (id >= 520 && id <= 531) return this.resolveIcon('rain'); // Showers
            return this.resolveIcon('rain');
        }

        // Snow (6xx)
        if (id >= 600 && id < 700) {
            if (id === 600) return this.resolveIcon('lightsnow');      // Light snow
            if (id === 601) return this.resolveIcon('snow');           // Snow
            if (id === 602) return this.resolveIcon('snow');           // Heavy snow
            if (id >= 611 && id <= 613) return this.resolveIcon('mixedsnow'); // Sleet
            if (id === 615 || id === 616) return this.resolveIcon('mixedsnow'); // Rain and snow
            if (id >= 620 && id <= 622) return this.resolveIcon('snow'); // Snow showers
            return this.resolveIcon('snow');
        }

        // Atmosphere (7xx)
        if (id >= 700 && id < 800) {
            if (id === 781) return this.resolveIcon('tornado');        // Tornado
            return this.resolveIcon('lowvisibility');                  // Mist, smoke, haze, dust, fog, etc.
        }

        // Clear (800)
        if (id === 800) return this.resolveIcon('sunny');

        // Clouds (80x)
        if (id === 801) return this.resolveIcon('partlycloudy');       // Few clouds
        if (id === 802) return this.resolveIcon('partlycloudy');       // Scattered clouds
        if (id === 803 || id === 804) return this.resolveIcon('cloudy'); // Broken/overcast clouds

        return this.resolveIcon('na');
    },

    /**
     * Map WeatherAPI.com condition codes to icons
     * Reference: https://www.weatherapi.com/docs/weather_conditions.json
     *
     * Code ranges:
     * 1000: Clear/Sunny
     * 1003-1009: Cloudy conditions
     * 1030-1147: Fog/Mist conditions
     * 1150-1171: Drizzle
     * 1180-1207: Rain
     * 1210-1237: Snow
     * 1240-1264: Showers
     * 1273-1282: Thunderstorms
     */
    getIconForWeatherAPI: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return this.resolveIcon('na');
        }
        var id = Number(code);

        // Clear/Sunny (1000)
        if (id === 1000) return this.resolveIcon('sunny');

        // Partly cloudy (1003)
        if (id === 1003) return this.resolveIcon('partlycloudy');

        // Cloudy (1006)
        if (id === 1006) return this.resolveIcon('cloudy');

        // Overcast (1009)
        if (id === 1009) return this.resolveIcon('cloudy');

        // Mist (1030)
        if (id === 1030) return this.resolveIcon('lowvisibility');

        // Patchy rain possible (1063)
        if (id === 1063) return this.resolveIcon('drizzle');

        // Patchy snow possible (1066)
        if (id === 1066) return this.resolveIcon('lightsnow');

        // Patchy sleet possible (1069)
        if (id === 1069) return this.resolveIcon('mixedsnow');

        // Patchy freezing drizzle possible (1072)
        if (id === 1072) return this.resolveIcon('mixedsnow');

        // Thundery outbreaks possible (1087)
        if (id === 1087) return this.resolveIcon('scatteredthunderstorms');

        // Blowing snow (1114)
        if (id === 1114) return this.resolveIcon('snow');

        // Blizzard (1117)
        if (id === 1117) return this.resolveIcon('snow');

        // Fog (1135)
        if (id === 1135) return this.resolveIcon('lowvisibility');

        // Freezing fog (1147)
        if (id === 1147) return this.resolveIcon('lowvisibility');

        // Patchy light drizzle (1150)
        if (id === 1150) return this.resolveIcon('drizzle');

        // Light drizzle (1153)
        if (id === 1153) return this.resolveIcon('drizzle');

        // Freezing drizzle (1168)
        if (id === 1168) return this.resolveIcon('mixedsnow');

        // Heavy freezing drizzle (1171)
        if (id === 1171) return this.resolveIcon('mixedsnow');

        // Patchy light rain (1180)
        if (id === 1180) return this.resolveIcon('drizzle');

        // Light rain (1183)
        if (id === 1183) return this.resolveIcon('drizzle');

        // Moderate rain at times (1186)
        if (id === 1186) return this.resolveIcon('rain');

        // Moderate rain (1189)
        if (id === 1189) return this.resolveIcon('rain');

        // Heavy rain at times (1192)
        if (id === 1192) return this.resolveIcon('rain');

        // Heavy rain (1195)
        if (id === 1195) return this.resolveIcon('rain');

        // Light freezing rain (1198)
        if (id === 1198) return this.resolveIcon('mixedsnow');

        // Moderate or heavy freezing rain (1201)
        if (id === 1201) return this.resolveIcon('mixedsnow');

        // Light sleet (1204)
        if (id === 1204) return this.resolveIcon('mixedsnow');

        // Moderate or heavy sleet (1207)
        if (id === 1207) return this.resolveIcon('mixedsnow');

        // Patchy light snow (1210)
        if (id === 1210) return this.resolveIcon('lightsnow');

        // Light snow (1213)
        if (id === 1213) return this.resolveIcon('lightsnow');

        // Patchy moderate snow (1216)
        if (id === 1216) return this.resolveIcon('snow');

        // Moderate snow (1219)
        if (id === 1219) return this.resolveIcon('snow');

        // Patchy heavy snow (1222)
        if (id === 1222) return this.resolveIcon('snow');

        // Heavy snow (1225)
        if (id === 1225) return this.resolveIcon('snow');

        // Ice pellets (1237)
        if (id === 1237) return this.resolveIcon('hail');

        // Light rain shower (1240)
        if (id === 1240) return this.resolveIcon('drizzle');

        // Moderate or heavy rain shower (1243)
        if (id === 1243) return this.resolveIcon('rain');

        // Torrential rain shower (1246)
        if (id === 1246) return this.resolveIcon('rain');

        // Light sleet showers (1249)
        if (id === 1249) return this.resolveIcon('mixedsnow');

        // Moderate or heavy sleet showers (1252)
        if (id === 1252) return this.resolveIcon('mixedsnow');

        // Light snow showers (1255)
        if (id === 1255) return this.resolveIcon('lightsnow');

        // Moderate or heavy snow showers (1258)
        if (id === 1258) return this.resolveIcon('snow');

        // Light showers of ice pellets (1261)
        if (id === 1261) return this.resolveIcon('hail');

        // Moderate or heavy showers of ice pellets (1264)
        if (id === 1264) return this.resolveIcon('hail');

        // Patchy light rain with thunder (1273)
        if (id === 1273) return this.resolveIcon('isolatedthunderstorms');

        // Moderate or heavy rain with thunder (1276)
        if (id === 1276) return this.resolveIcon('thundershowers');

        // Patchy light snow with thunder (1279)
        if (id === 1279) return this.resolveIcon('storm');

        // Moderate or heavy snow with thunder (1282)
        if (id === 1282) return this.resolveIcon('storm');

        return this.resolveIcon('na');
    }
};

module.exports = IconMapper;
