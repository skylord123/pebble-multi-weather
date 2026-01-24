/**
 * Constants - Application-wide constants
 */

var Constants = {
    // App info
    appVersion: '1.0',
    appName: 'Multi Weather',

    // Config page settings
    CONFIG_PAGE_BASE_URL: 'https://skylord123.github.io/pebble-multi-weather/config/',
    CONFIG_PAGE_VERSION: 'v1.0.html',

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
        }
        // Future providers can be added here:
        // openweather: { id: 'openweather', name: 'OpenWeather', ... },
        // weatherapi: { id: 'weatherapi', name: 'WeatherAPI', ... },
    },

    // Default provider order for main menu
    providerOrder: ['nws', 'openmeteo', 'metno'],

    // HTTP request settings
    requestTimeout: 30000,
    userAgent: 'PebbleMultiWeather/1.0 (contact@example.com)',

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

    // Default temperature unit
    defaultUnit: 'F',

    // Quick glance options
    quickGlance: {
        TEMPERATURE: 'temperature',
        HUMIDITY: 'humidity',
        WIND: 'wind',
        FORECAST: 'forecast'
    },

    // Menu background modes
    menuBackgroundModes: {
        SUN: 'sun',
        BLACK: 'black',
        WHITE: 'white'
    }
};

module.exports = Constants;
