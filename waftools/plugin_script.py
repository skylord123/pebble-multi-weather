"""
Build the plugin script, build/plugin.js.

The plugin runs in its own JS engine on the phone, with fetch but no
XMLHttpRequest, timers or WebView, so it cannot load the watch app's JS
whole. It gets the app modules it shares (the weather services and what
they need) plus its own from src/plugin, in the same loader format the
watch app's JS uses. Two of its own stand in for app modules: lib/ajax on
top of fetch, and a read-only settings.

Every require() in the bundle has to resolve inside it. A shared module
that starts needing something the plugin does not carry fails the build
here, rather than failing on the phone.
"""
import json
import os
import re

from waflib import Logs
from waflib.Configure import conf

JS_ROOT = os.path.join('src', 'js')
PLUGIN_ROOT = os.path.join('src', 'plugin')
TARGET = 'plugin.js'
ENTRY = 'plugin/main'

# Watch app modules the plugin shares, as paths under src/js
SHARED = [
    'app/Constants.js',
    'app/AppState.js',
    'app/helpers.js',
    'app/Conditions.js',
    'app/ProviderSettings.js',
    'app/services/WeatherService.js',
    'app/services/NWSService.js',
    'app/services/OpenMeteoService.js',
    'app/services/MetNoService.js',
    'app/services/OpenWeatherService.js',
    'app/services/WeatherAPIService.js',
]

# The plugin's own modules, and the module path each is loaded as
OWN = {
    'ajax.js': 'lib/ajax.js',
    'settings.js': 'settings.js',
    'main.js': 'plugin/main.js',
    'Forecasts.js': 'plugin/Forecasts.js',
    'Sources.js': 'plugin/Sources.js',
    'Glyphs.js': 'plugin/Glyphs.js',
}

# What the plugin's copy of appinfo.json keeps
APPINFO_KEYS = ('uuid', 'shortName', 'longName', 'versionLabel')

# Mirrors src/js/loader.js
LOADER_PATHS = ['/', 'lib', 'vendor', 'app']
LOADER_EXTS = ['%s', '%s.js', '%s.json', '%s/index.js']

LOADER_TEMPLATE = ('__loader.define({relpath}, {lineno}, '
                   'function(exports, module, require) {{\n{body}\n}});')
REQUIRE = re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)""")


def _normalize(path):
    parts = []
    for part in path.split('/'):
        if part in ('', '.'):
            continue
        if part == '..':
            if parts:
                parts.pop()
            continue
        parts.append(part)
    return '/'.join(parts)


def _resolves(name, requirer, modules):
    """Whether the loader would find `name` required from `requirer`."""
    bases = [os.path.dirname(requirer) + '/' + name, name]
    bases += [prefix + '/' + name for prefix in LOADER_PATHS]
    for base in bases:
        for ext in LOADER_EXTS:
            if _normalize(ext % base) in modules:
                return True
    return False


def sources(root):
    """(module path, file) for everything the plugin is made of."""
    entries = [(rel, os.path.join(root, JS_ROOT, rel)) for rel in SHARED]
    entries += [(path, os.path.join(root, PLUGIN_ROOT, name))
                for name, path in sorted(OWN.items(), key=lambda item: item[1])]
    return entries


def bundle(root, appinfo_path, output_path):
    modules = {}
    for relpath, path in sources(root):
        with open(path, 'r') as source:
            modules[relpath] = source.read()
    # Only who the app is: the resource list is no use to the plugin
    with open(appinfo_path, 'r') as appinfo:
        identity = dict((key, value) for key, value in json.load(appinfo).items() if key in APPINFO_KEYS)
    modules['appinfo.json'] = 'module.exports = %s;' % json.dumps(identity, sort_keys=True)

    missing = []
    for relpath, body in sorted(modules.items()):
        for name in REQUIRE.findall(body):
            if not _resolves(name, relpath, modules):
                missing.append('%s requires %s' % (relpath, name))
    if missing:
        raise ValueError('the plugin script cannot load what these need:\n  ' +
                         '\n  '.join(missing) +
                         '\nAdd the module to SHARED or OWN in waftools/plugin_script.py,'
                         ' or keep it out of the shared code.')

    with open(os.path.join(root, JS_ROOT, 'loader.js'), 'r') as loader:
        parts = [loader.read()]
    lineno = parts[0].count('\n') + 2
    for relpath in sorted(modules):
        part = LOADER_TEMPLATE.format(relpath=json.dumps(relpath), lineno=lineno, body=modules[relpath])
        parts.append(part)
        lineno += part.count('\n') + 1
    parts.append('__loader.require(%s);' % json.dumps(ENTRY))

    with open(output_path, 'w') as output:
        output.write('\n'.join(parts) + '\n')


@conf
def build_plugin_script(ctx):
    """Add the task that writes build/plugin.js; returns its node."""
    root = ctx.path.abspath()
    inputs = [ctx.path.find_node(os.path.relpath(path, root)) for _, path in sources(root)]
    # This file too, so a change to what goes in rebuilds the script; appinfo.json last
    inputs += [ctx.path.find_node(os.path.join(JS_ROOT, 'loader.js')),
               ctx.path.find_node(os.path.join('waftools', 'plugin_script.py')),
               ctx.path.find_node('appinfo.json')]
    if None in inputs:
        ctx.fatal('A plugin source file is missing: %s' % [
            path for (_, path), node in zip(sources(root), inputs) if node is None])
    target = ctx.bldnode.make_node(TARGET)

    def run(task):
        try:
            bundle(root, task.inputs[-1].abspath(), task.outputs[0].abspath())
        except ValueError as err:
            Logs.error(str(err))
            return 1
        return 0

    ctx(rule=run, source=inputs, target=target)
    return target
