/**
 * Constants - Application-wide constants
 */

var Constants = {
    // App info
    appVersion: '1.1',
    appName: 'Multi Weather',

    // Config page settings
    CONFIG_PAGE_BASE_URL: 'https://skylord123.github.io/pebble-multi-weather/config/',
    CONFIG_PAGE_VERSION: 'v1.1.html',

    // Debug settings
    debug: true,

    // Weather provider definitions
    providers: {
        nws: {
            id: 'nws',
            name: 'NWS',
            fullName: 'National Weather Service',
            baseUrl: 'https://api.weather.gov',
            cacheDuration: 15 // minutes
        },
        openmeteo: {
            id: 'openmeteo',
            name: 'Open-Meteo',
            fullName: 'Open-Meteo',
            baseUrl: 'https://api.open-meteo.com',
            cacheDuration: 15 // minutes
        },
        metno: {
            id: 'metno',
            name: 'Meteorologisk institutt',
            fullName: 'Meteorologisk institutt',
            baseUrl: 'https://api.met.no/weatherapi/locationforecast/2.0',
            cacheDuration: 15 // minutes
        },
        openweather: {
            id: 'openweather',
            name: 'OpenWeather',
            fullName: 'OpenWeatherMap',
            baseUrl: 'https://api.openweathermap.org/data/3.0',
            cacheDuration: 15, // minutes
            requiresApiKey: true
        },
        weatherapi: {
            id: 'weatherapi',
            name: 'WeatherAPI',
            fullName: 'WeatherAPI.com',
            baseUrl: 'https://api.weatherapi.com/v1',
            cacheDuration: 15, // minutes
            requiresApiKey: true
        }
    },

    // Default provider order for main menu
    providerOrder: ['nws', 'openmeteo', 'metno', 'openweather', 'weatherapi'],

    // HTTP request settings
    requestTimeout: 30000,
    userAgent: 'PebbleMultiWeather/' + this.appVersion + ' (multiweather@skylarsadlier.com)',

    // Refresh interval in minutes
    defaultRefreshInterval: 15,

    // Cache settings
    cachePrefix: 'weather_cache_',

    // Temperature units
    units: {
        FAHRENHEIT: 'F',
        CELSIUS: 'C'
    },

    // Speed units
    speedUnits: {
        MPH: 'mph',
        KMH: 'kmh'
    },

    // Time format
    timeFormats: {
        HOUR_12: '12h',
        HOUR_24: '24h'
    },

    // Default time format
    defaultTimeFormat: '12h',

    // Default temperature unit
    defaultUnit: 'F',

    // Quick glance options
    quickGlance: {
        TEMPERATURE: 'temperature',
        HUMIDITY: 'humidity',
        WIND: 'wind',
        FORECAST: 'forecast',
        CUSTOM_TEMPLATE: 'custom_template'
    },

    // Default custom template for quick glance
    defaultCustomTemplate: '{temp} H:{temp_high} L:{temp_low} {wind_direction} {windspeed}',

    // Menu background modes
    menuBackgroundModes: {
        SUN: 'sun',
        BLACK: 'black',
        WHITE: 'white'
    },

    // Detailed forecast subtitle options
    detailedForecastSubtitle: {
        SHORT_FORECAST: 'short_forecast',
        LONG_FORECAST: 'long_forecast',
        SHORT_FORECAST_TEMP: 'short_forecast_temp',
        HIGH_LOW_TEMP: 'high_low_temp',
        WIND: 'wind',
        CUSTOM_TEMPLATE: 'custom_template'
    },

    // Default custom template for detailed forecast subtitle
    defaultDetailedForecastSubtitleTemplate: '{temp} {temp_high} / {temp_low} {precip}'
};

module.exports = Constants;
