# Settings page

The watch app's settings page lives in this folder, one file per version
(`v1.3.html` is current; `src/js/app/Constants.js` names the file in
`CONFIG_PAGE_VERSION`). Each file is self-contained: no scripts, stylesheets
or icon fonts are loaded from anywhere else. That is what lets one file serve
two very different homes.

## Two ways the page is opened

**Hosted.** Every push deploys this folder to GitHub Pages, and the classic
Pebble/Rebble phone apps open the page from there when the gear icon is tapped
(`CONFIG_PAGE_BASE_URL` + `CONFIG_PAGE_VERSION`). The settings arrive in the
URL hash as a JSON object, and Save hands the edited object back through
`pebblejs://close#…`, which closes the page. Nothing about this flow changed
with v1.3.

**Bundled.** Newer Core Devices Pebble apps read `configPage` from the pbw's
`appinfo.json` and open that file straight from the pbw, without any network.
The build puts the current page there as `config.html`
(`waftools/bundle_config_page.py`, run after `pebble build` zips the pbw).
While the page is open it can talk to the watch app's JS, so it can check API
keys, test providers and save without closing. The phone runs the page from a
`data:` URL, so `localStorage` is unavailable and relative paths do not
resolve.

The page decides which mode it is in by whether the phone injected a `Pebble`
object with `sendMessage`. A phone app that does not know about bundled pages
ignores the `configPage` key and the extra file, and everything works as
before.

## Protocol between the page and the watch app

The page sends `Pebble.sendMessage('pkjs', request)` and awaits the reply. On
the watch app side `src/js/app/ConfigBridge.js` receives it as a
`configmessage` event and answers with `e.respond(reply)`. Every request is an
object with a `type`; every reply is `{ ok: true, … }` or
`{ ok: false, error: { code, message } }`. When the watch app is not reachable
the phone answers instead with a bare `{ error: "…" }`, which the page treats
the same way.

| Request | Reply |
| --- | --- |
| `{ type: 'get_settings' }` | `{ ok, app_version, conf_version, settings, status }`. `settings` is the whole options object, the same shape the hosted page reads from its hash. |
| `{ type: 'get_status' }` | `{ ok, status }` |
| `{ type: 'save_settings', settings }` | `{ ok }`. Merges `settings` into the stored options and applies them, exactly as closing the hosted page does. |
| `{ type: 'test_provider', provider, api_key? }` | For a provider that needs a key: checks `api_key`, or the saved key when it is left out. A new key that works is saved and the provider switched on, and the reply is `{ ok, settings }` with the values that were saved. For any other provider: fetches the weather where the watch is and replies `{ ok, location, summary }`. Error codes: `unknown_provider`, `missing_key`, `invalid_key`, `rate_limited`, `unreachable`, `no_location`, `unavailable` (the provider does not cover this location), `provider_error`, `timeout`. |

Any request can also fail with `unknown_type`, `bad_request` or `internal` (the
handler threw; the message says what).

A key is checked where the watch is, or in London when the watch has no
location yet, since only the key is being tested.

The watch app also pushes at the page, without being asked, with
`Pebble.sendConfigMessage(…)`; the page receives it as a `message` event:

```js
{ type: 'status', status }
```

`status` is `{ has_location, providers }`, where `providers` maps each
provider id to `{ enabled, state, error, summary }` and, for providers that
need one, `has_key`. `state` is one of `unknown`, `loading`, `loaded`, `error`
or `unavailable`; `error` is `null` or `{ title, detail }`; `summary` is the
main menu subtitle once the weather has loaded. A push goes out when the watch
gets its location and whenever a provider finishes loading, so the page's
status lines follow the watch as it refreshes.

## Working on the page

Open `config/v1.3.html` in a browser with the settings in the hash to work on
the hosted mode, e.g.

```
file:///…/config/v1.3.html#%7B%22temperature_unit%22%3A%22C%22%7D
```

Save then navigates to `pebblejs://close#…`, which a browser cannot open;
`?return_to=<url>#` in the query string sends it to that URL instead, which is
also what `pebble emu-app-config` does.

For the bundled mode, define a `window.Pebble` before the page's script runs
that offers `sendMessage(target, message)` returning a Promise,
`addEventListener('ready' | 'message', cb)`, and fires `ready` with
`{ target: 'pkjs' }`. The page then behaves exactly as it does on the phone.
