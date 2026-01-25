# Multi Weather

A Pebble smartwatch app that displays weather data from multiple weather providers. Get current conditions, high/low temperatures, and forecasts right on your wrist.

Support
-------

If Multi Weather has been useful to you, consider supporting its development.
All of my projects are fully open-source and free — donations help cover time, tools, and ongoing maintenance.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B51BM7C)
[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate/?hosted_button_id=4VS2UQWDUALXA)

## Features

- **Multiple Weather Providers** — View weather data from different sources. Disable/Enable providers as necessary.
- **Re-orderable Provider List** — Change the order of providers in the main menu to suit your preferences
- **GPS Location** — Automatically uses your current location
- **Current Conditions** — See current temperature at a glance
- **Daily High/Low** — Quickly check the day's temperature range
- **Auto-Refresh** — Weather data updates automatically in the background
- **Custom Templates** — Create your own format for Quick Glance (text under a provider's name on main menu) using variables like `{temp}`, `{humidity}`, `{conditions}`, etc
- **Sun-based Theme** — Menu background changes automatically based on sunrise/sunset times (or you can force black/white always)

## Supported Providers

### Free
- **NWS** — National Weather Service (weather.gov)
- **Open-Meteo** — Open-Meteo (open-meteo.com)
- **Meteorologisk institutt (MET Norway)** — met.no

### Paid
- **OpenWeatherMap** — OpenWeatherMap (openweathermap.org)
  - Requires One Call API 3.0 subscription (free up to 1,000 calls/day, but requires billing info)
  - Configure your API key in the mobile app settings

## How to Use

### Main Menu
- **Select** a provider to view detailed weather information
- **Long press** on a provider to force refresh its data
- Scroll down to access **Settings**

### Weather Details
Each provider offers:
- **Current Conditions** — Temperature, humidity, wind, and more
- **Detailed Forecast** — Multi-day forecast with conditions
- **Graphs** — Visual 24-hour forecasts for precipitation, temperature, humidity, and wind speed

### Graph Navigation
- **Up/Down** — Switch between weather providers to compare data
- **Select** — View hour-by-hour breakdown in list format
- **Back** — Return to provider menu

### Settings (In-App)
Access from the main menu:
- **Providers** — Enable/disable weather providers
- **Temp Unit** — Fahrenheit or Celsius
- **Speed Unit** — mph or km/h
- **Show Both Units** — Display both °F and °C
- **Menu Background** — Sun-based (auto day/night), black, or white

### Settings (Mobile App)
Open the Pebble app on your phone and configure:
- **Provider Order** — Drag to reorder providers in the main menu
- **Enable/Disable Providers** — Check/uncheck to show or hide
- **Quick Glance** — Choose what shows below each provider name (temperature, humidity, wind, forecast, or custom template)
- **Custom Template** — Create your own format using variables like `{temp}`, `{humidity}`, `{conditions}`
- **API Keys** — Configure keys for paid providers (click the gear icon next to OpenWeatherMap)

## License

MIT License - see LICENSE file for details.
