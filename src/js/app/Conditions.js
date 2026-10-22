/**
 * Conditions - What each provider's weather looks like, as one set of keys
 *
 * Every provider describes the sky its own way: NWS with icon URLs, MET
 * Norway with symbol codes, the rest with numeric codes. These map each onto
 * the same keys (sunny, rain, thundershowers, ...), which the watch app turns
 * into its icons and the plugin into the shared weather vocabulary. Nothing
 * here touches the UI, so the plugin can load it too.
 */

var Conditions = {
    /**
     * The condition for a period of a provider's forecast, hourly or daily
     * @param {string} providerId - Provider identifier
     * @param {Object} period - A forecast period from the provider's service
     * @returns {string} Condition key, 'na' when unknown
     */
    forPeriod: function(providerId, period) {
        if (!period) {
            return 'na';
        }
        if (providerId === 'nws') return this.nws(period.icon);
        if (providerId === 'openmeteo') return this.openMeteo(period.weatherCode);
        if (providerId === 'metno') return this.metNo(period.symbolCode);
        if (providerId === 'openweather') return this.openWeather(period.weatherCode);
        if (providerId === 'weatherapi') return this.weatherApi(period.weatherCode);
        return 'na';
    },

    /**
     * The current condition from a provider's weather data
     * @param {string} providerId - Provider identifier
     * @param {Object} weatherData - Weather data from the provider's service
     * @returns {string} Condition key, 'na' when unknown
     */
    forWeather: function(providerId, weatherData) {
        if (!weatherData) {
            return 'na';
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
            return this.nws(iconUrl);
        }
        if (providerId === 'openmeteo') {
            var code = weatherData.currentWeatherCode;
            if ((code === null || code === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                code = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.openMeteo(code);
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
            return this.metNo(symbolCode);
        }
        if (providerId === 'openweather') {
            var owmCode = weatherData.currentWeatherCode;
            if ((owmCode === null || owmCode === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                owmCode = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.openWeather(owmCode);
        }
        if (providerId === 'weatherapi') {
            var waCode = weatherData.currentWeatherCode;
            if ((waCode === null || waCode === undefined) && weatherData.hourlyForecast &&
                weatherData.hourlyForecast.periods && weatherData.hourlyForecast.periods.length > 0) {
                waCode = weatherData.hourlyForecast.periods[0].weatherCode;
            }
            return this.weatherApi(waCode);
        }
        return 'na';
    },

    /**
     * Map Open-Meteo WMO weather codes to icons
     * Reference: https://gist.github.com/stellasphere/9490c195ed2b53c707087c8c2db4ec0c
     * WMO Code Table 4677
     */
    openMeteo: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return 'na';
        }
        var value = Number(code);

        // Clear conditions (0-3)
        if (value === 0) return 'sunny';           // Clear sky
        if (value === 1) return 'sunny';           // Mainly clear (still mostly sunny)
        if (value === 2) return 'partlycloudy';    // Partly cloudy
        if (value === 3) return 'cloudy';          // Overcast

        // Fog (45, 48)
        if (value === 45) return 'lowvisibility';  // Fog
        if (value === 48) return 'lowvisibility';  // Depositing rime fog

        // Drizzle (51-57)
        if (value === 51) return 'drizzle';        // Light drizzle
        if (value === 53) return 'drizzle';        // Moderate drizzle
        if (value === 55) return 'drizzle';        // Dense drizzle
        if (value === 56) return 'mixedsnow';      // Light freezing drizzle
        if (value === 57) return 'mixedsnow';      // Dense freezing drizzle

        // Rain (61-67)
        if (value === 61) return 'drizzle';        // Slight rain
        if (value === 63) return 'rain';           // Moderate rain
        if (value === 65) return 'rain';           // Heavy rain
        if (value === 66) return 'mixedsnow';      // Light freezing rain
        if (value === 67) return 'mixedsnow';      // Heavy freezing rain

        // Snow (71-77)
        if (value === 71) return 'lightsnow';      // Slight snow fall
        if (value === 73) return 'snow';           // Moderate snow fall
        if (value === 75) return 'snow';           // Heavy snow fall
        if (value === 77) return 'lightsnow';      // Snow grains

        // Rain showers (80-82)
        if (value === 80) return 'drizzle';        // Slight rain showers
        if (value === 81) return 'rain';           // Moderate rain showers
        if (value === 82) return 'rain';           // Violent rain showers

        // Snow showers (85-86)
        if (value === 85) return 'lightsnow';      // Slight snow showers
        if (value === 86) return 'snow';           // Heavy snow showers

        // Thunderstorm (95-99)
        if (value === 95) return 'thundershowers'; // Thunderstorm
        if (value === 96) return 'hail';           // Thunderstorm with slight hail
        if (value === 99) return 'hail';           // Thunderstorm with heavy hail

        return 'na';
    },

    nws: function(iconUrl) {
        if (!iconUrl || typeof iconUrl !== 'string') {
            return 'na';
        }
        var cleaned = iconUrl.split('?')[0];
        var parts = cleaned.split('/');
        var name = parts[parts.length - 1] || '';
        name = name.split(',')[0].toLowerCase();

        if (name.indexOf('tornado') !== -1) return 'tornado';
        if (name.indexOf('hurricane') !== -1 || name.indexOf('tropical') !== -1) return 'hurricane';
        if (name.indexOf('hot') !== -1) return 'hot';
        if (name.indexOf('cold') !== -1) return 'cold';
        if (name.indexOf('wind') !== -1) return 'windy';
        if (name.indexOf('fog') !== -1 || name.indexOf('haze') !== -1 || name.indexOf('smoke') !== -1 || name.indexOf('dust') !== -1 || name.indexOf('mist') !== -1) {
            return 'lowvisibility';
        }
        if (name.indexOf('hail') !== -1) return 'hail';
        if (name.indexOf('sleet') !== -1 || name.indexOf('ip') !== -1 || name.indexOf('fzra') !== -1 || name.indexOf('freezing') !== -1 || name.indexOf('ra_sn') !== -1 || name.indexOf('rain_snow') !== -1 || name.indexOf('mix') !== -1) {
            return 'mixedsnow';
        }
        if (name.indexOf('tsra_sct') !== -1 || name.indexOf('scttsra') !== -1) return 'scatteredthunderstorms';
        if (name.indexOf('tsra_hi') !== -1) return 'storm';
        if (name.indexOf('tsra') !== -1 || name.indexOf('tstorm') !== -1 || name.indexOf('thunder') !== -1) return 'thundershowers';
        if (name.indexOf('snow') !== -1 || name.indexOf('sn') !== -1) return 'snow';
        if (name.indexOf('drizzle') !== -1) return 'drizzle';
        if (name.indexOf('rain') !== -1 || name.indexOf('ra') !== -1 || name.indexOf('shra') !== -1 || name.indexOf('showers') !== -1) return 'rain';
        if (name.indexOf('sct') !== -1 || name.indexOf('few') !== -1 || name.indexOf('partly') !== -1) return 'partlycloudy';
        if (name.indexOf('bkn') !== -1 || name.indexOf('ovc') !== -1 || name.indexOf('cloudy') !== -1) return 'cloudy';
        if (name.indexOf('skc') !== -1 || name.indexOf('clear') !== -1) return 'sunny';

        return 'na';
    },

    metNo: function(symbolCode) {
        if (!symbolCode || typeof symbolCode !== 'string') {
            return 'na';
        }
        var code = symbolCode.toLowerCase();

        if (code.indexOf('thunder') !== -1) return 'thundershowers';
        if (code.indexOf('sleet') !== -1 || code.indexOf('snowandrain') !== -1 || code.indexOf('rainandsnow') !== -1) {
            return 'mixedsnow';
        }
        if (code.indexOf('snow') !== -1) {
            if (code.indexOf('light') !== -1) return 'lightsnow';
            return 'snow';
        }
        if (code.indexOf('rain') !== -1) {
            if (code.indexOf('light') !== -1) return 'drizzle';
            return 'rain';
        }
        if (code.indexOf('fog') !== -1) return 'lowvisibility';
        // Before 'cloudy', which 'partlycloudy' also contains
        if (code.indexOf('partlycloudy') !== -1) return 'partlycloudy';
        if (code.indexOf('cloudy') !== -1) return 'cloudy';
        if (code.indexOf('fair') !== -1 || code.indexOf('clearsky') !== -1) return 'sunny';

        return 'na';
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
    openWeather: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return 'na';
        }
        var id = Number(code);

        // Thunderstorm (2xx)
        if (id >= 200 && id < 300) {
            if (id >= 200 && id <= 202) return 'thundershowers';
            if (id >= 210 && id <= 221) return 'storm';
            if (id >= 230 && id <= 232) return 'thundershowers';
            return 'thundershowers';
        }

        // Drizzle (3xx)
        if (id >= 300 && id < 400) {
            return 'drizzle';
        }

        // Rain (5xx)
        if (id >= 500 && id < 600) {
            if (id === 500) return 'drizzle';        // Light rain
            if (id === 511) return 'mixedsnow';      // Freezing rain
            if (id >= 520 && id <= 531) return 'rain'; // Showers
            return 'rain';
        }

        // Snow (6xx)
        if (id >= 600 && id < 700) {
            if (id === 600) return 'lightsnow';      // Light snow
            if (id === 601) return 'snow';           // Snow
            if (id === 602) return 'snow';           // Heavy snow
            if (id >= 611 && id <= 613) return 'mixedsnow'; // Sleet
            if (id === 615 || id === 616) return 'mixedsnow'; // Rain and snow
            if (id >= 620 && id <= 622) return 'snow'; // Snow showers
            return 'snow';
        }

        // Atmosphere (7xx)
        if (id >= 700 && id < 800) {
            if (id === 781) return 'tornado';        // Tornado
            return 'lowvisibility';                  // Mist, smoke, haze, dust, fog, etc.
        }

        // Clear (800)
        if (id === 800) return 'sunny';

        // Clouds (80x)
        if (id === 801) return 'partlycloudy';       // Few clouds
        if (id === 802) return 'partlycloudy';       // Scattered clouds
        if (id === 803 || id === 804) return 'cloudy'; // Broken/overcast clouds

        return 'na';
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
    weatherApi: function(code) {
        if (code === null || code === undefined || isNaN(code)) {
            return 'na';
        }
        var id = Number(code);

        // Clear/Sunny (1000)
        if (id === 1000) return 'sunny';

        // Partly cloudy (1003)
        if (id === 1003) return 'partlycloudy';

        // Cloudy (1006)
        if (id === 1006) return 'cloudy';

        // Overcast (1009)
        if (id === 1009) return 'cloudy';

        // Mist (1030)
        if (id === 1030) return 'lowvisibility';

        // Patchy rain possible (1063)
        if (id === 1063) return 'drizzle';

        // Patchy snow possible (1066)
        if (id === 1066) return 'lightsnow';

        // Patchy sleet possible (1069)
        if (id === 1069) return 'mixedsnow';

        // Patchy freezing drizzle possible (1072)
        if (id === 1072) return 'mixedsnow';

        // Thundery outbreaks possible (1087)
        if (id === 1087) return 'scatteredthunderstorms';

        // Blowing snow (1114)
        if (id === 1114) return 'snow';

        // Blizzard (1117)
        if (id === 1117) return 'snow';

        // Fog (1135)
        if (id === 1135) return 'lowvisibility';

        // Freezing fog (1147)
        if (id === 1147) return 'lowvisibility';

        // Patchy light drizzle (1150)
        if (id === 1150) return 'drizzle';

        // Light drizzle (1153)
        if (id === 1153) return 'drizzle';

        // Freezing drizzle (1168)
        if (id === 1168) return 'mixedsnow';

        // Heavy freezing drizzle (1171)
        if (id === 1171) return 'mixedsnow';

        // Patchy light rain (1180)
        if (id === 1180) return 'drizzle';

        // Light rain (1183)
        if (id === 1183) return 'drizzle';

        // Moderate rain at times (1186)
        if (id === 1186) return 'rain';

        // Moderate rain (1189)
        if (id === 1189) return 'rain';

        // Heavy rain at times (1192)
        if (id === 1192) return 'rain';

        // Heavy rain (1195)
        if (id === 1195) return 'rain';

        // Light freezing rain (1198)
        if (id === 1198) return 'mixedsnow';

        // Moderate or heavy freezing rain (1201)
        if (id === 1201) return 'mixedsnow';

        // Light sleet (1204)
        if (id === 1204) return 'mixedsnow';

        // Moderate or heavy sleet (1207)
        if (id === 1207) return 'mixedsnow';

        // Patchy light snow (1210)
        if (id === 1210) return 'lightsnow';

        // Light snow (1213)
        if (id === 1213) return 'lightsnow';

        // Patchy moderate snow (1216)
        if (id === 1216) return 'snow';

        // Moderate snow (1219)
        if (id === 1219) return 'snow';

        // Patchy heavy snow (1222)
        if (id === 1222) return 'snow';

        // Heavy snow (1225)
        if (id === 1225) return 'snow';

        // Ice pellets (1237)
        if (id === 1237) return 'hail';

        // Light rain shower (1240)
        if (id === 1240) return 'drizzle';

        // Moderate or heavy rain shower (1243)
        if (id === 1243) return 'rain';

        // Torrential rain shower (1246)
        if (id === 1246) return 'rain';

        // Light sleet showers (1249)
        if (id === 1249) return 'mixedsnow';

        // Moderate or heavy sleet showers (1252)
        if (id === 1252) return 'mixedsnow';

        // Light snow showers (1255)
        if (id === 1255) return 'lightsnow';

        // Moderate or heavy snow showers (1258)
        if (id === 1258) return 'snow';

        // Light showers of ice pellets (1261)
        if (id === 1261) return 'hail';

        // Moderate or heavy showers of ice pellets (1264)
        if (id === 1264) return 'hail';

        // Patchy light rain with thunder (1273)
        if (id === 1273) return 'isolatedthunderstorms';

        // Moderate or heavy rain with thunder (1276)
        if (id === 1276) return 'thundershowers';

        // Patchy light snow with thunder (1279)
        if (id === 1279) return 'storm';

        // Moderate or heavy snow with thunder (1282)
        if (id === 1282) return 'storm';

        return 'na';
    }
};

module.exports = Conditions;
