# Weather plugin

Multi Weather's pbw carries a [Pebble plugin](https://github.com/coredevices/mobileapp/blob/master/test-apps/plugins.md):
a script the phone runs on its own to serve the weather Multi Weather fetches
to any watchface or app that reads the `weather` category. It uses the
providers, order, API keys and units picked in Multi Weather's settings.

Plugins are experimental: the Pebble mobile app (v1.14+) only runs them with
**Settings → Debug → Use experimental plugins** on, and its plugin API may
still change. Phone apps without plugins ignore the plugin entirely.

## What it serves

The same names and shapes as the phone's built-in weather plugin, so a face
written for one works with the other. Properties marked *extra* are ones the
built-in plugin does not have.

### `weather/location`

One instance per provider switched on, in the order of the main menu. A
provider with nothing to serve (NWS outside the US, a bad API key, no
connection and nothing recent cached) is left out, so the first instance is
the first provider that has weather. `instanceId` is the provider id (`nws`,
`openmeteo`, `metno`, `openweather`, `weatherapi`).

| Property | Shapes | |
| --- | --- | --- |
| `name` | shortText | The provider, which is what tells the instances apart in a picker |
| `temperature`, `feels_like`, `high`, `low` | shortText, longText, numericValue | In the unit picked in Multi Weather. Feels like is wind chill or heat index, by the NWS formulas |
| `condition` | shortText, longText, icon, image | shortText is a short name; longText is the provider's own words; icon and image only when the request has `iconPixelSize` |
| `condition_code` | longText | The shared vocabulary: `sun`, `partly_cloudy`, `cloudy`, `light_rain`, `heavy_rain`, `light_snow`, `heavy_snow`, `rain_and_snow`, `unknown` |
| `precipitation` | numericValue, shortText | Today's chance, where the provider gives one as a percentage |
| `place` | shortText, longText | *Extra.* The place the provider names (NWS, WeatherAPI.com) |
| `provider` | shortText, longText | *Extra.* The provider's short and full name |
| `humidity` | numericValue, shortText | *Extra* |
| `wind` | shortText, longText, numericValue | *Extra.* Speed in the unit picked; longText adds the direction |
| `updated` | timestamp | *Extra.* When the provider observed or forecast it |

### `weather/hour`

The six hours after this one, soonest first, from the first provider switched
on that has an hourly forecast. `instanceId` is the position, `0` being the
next hour, as with the built-in plugin.

| Property | Shapes | |
| --- | --- | --- |
| `temperature` | numericValue, shortText | |
| `condition` | shortText, longText, icon, image | |
| `condition_code` | longText | |
| `time` | timestamp, shortText | *Extra.* The start of the hour; shortText in the time format picked |
| `precipitation` | numericValue, shortText | *Extra.* The chance, where the provider gives one as a percentage |
| `provider` | shortText, longText | *Extra.* Which provider the hours are from |

### Glyphs

`icon` is the condition in black on a transparent ground, for a consumer to
recolour; `image` is the condition in white on a disc in its colour. Both are
drawn in `Glyphs.js` at the size asked for, from Multi Weather's own condition
keys, so thunder, fog, hail and wind get pictures of their own even though
`condition_code` has no word for them. The same request always gets the same
pixels, so a consumer can skip sending a bitmap that has not changed.

## How it works

The phone starts the script for each request and stops it straight after, so
nothing is kept in variables. It has `fetch`, `localStorage` (shared with the
watch app's JS) and `navigator.geolocation`, but no `XMLHttpRequest`, no
timers and no WebView.

- `waftools/plugin_script.py` builds `build/plugin.js` from the watch app's
  weather services and what they need (`app/Constants`, `app/helpers`,
  `app/Conditions`, `app/ProviderSettings`, ...) plus the modules here, in the
  same loader format as the watch app's JS. `ajax.js` stands in for `lib/ajax`
  on top of `fetch`, and `settings.js` for `settings`. The build fails if any
  `require` in the bundle cannot be resolved inside it.
- `waftools/bundle_pbw_files.py` puts `plugin.js` in the pbw after
  `pebble build` has zipped it. `appinfo.json` declares the plugin (`plugin`),
  what the app needs (`usesPermissions`: `Location` and each provider's
  domain) and `manifestVersion: 2`, without which the phone will not load a
  plugin. That declaration covers the watch app's own JS too.
- `Forecasts.js` gets each provider's weather. The plugin keeps a small
  snapshot per provider under `plugin_forecast:<id>` in `localStorage`. A
  request uses, in order: that snapshot while it is current for this place
  (the provider's cache duration, 15 minutes), the watch app's own cache while
  that is, a fresh fetch, and if the fetch fails, the last snapshot or app
  cache up to 6 hours old. A stale answer says so with a `validUntilMs` five
  minutes ahead.
- The plugin only reads the watch app's options (`options:<uuid>`), never
  writes them: the app holds them in memory and writes the whole set back, so
  writes from both sides would undo each other.
- With no timers, nothing can give up on a provider that never calls back.
  `ajax.js` counts the requests in flight instead; once none are left, a
  provider still waiting is reported as not answering, so one broken provider
  cannot hold up the others until the phone times the request out.
- Error messages go to whichever app reads the plugin, so they never carry a
  URL, and the user's API keys are removed from any text a provider sends
  back.
- The location is the phone's (a fix up to 15 minutes old will do). If the
  phone cannot find one, the place the watch app last found itself is used,
  but not when the user has refused location access.

Errors are reported with the plugin error codes: `PERMISSION_DENIED` when
location access is off, `PLUGIN_UNAVAILABLE` when no provider is switched on
or there is no location, `RATE_LIMITED` when a provider says so,
`INVALID_REQUEST` for anything but `weather/location` and `weather/hour`, and
`UNKNOWN` otherwise.

## Talking to it from the settings page

While the bundled settings page is open, the phone starts the plugin too and
fires `ready` with `target: 'plugin'`. The page sends it
`{ type: 'refresh' }` after saving, and the plugin calls
`Pebble.refreshSources` so subscribers re-read now rather than at their next
poll (every 15 minutes).

## Trying it

Build as usual (`pebble build`), sideload the pbw with experimental plugins
on, and install the "Plugin Demo: Weather Face" or "Plugin Demo: Dashboard"
from the Pebble app. Multi Weather shows up in their plugin pickers, and in
the Plugins tab of the Apps screen.
