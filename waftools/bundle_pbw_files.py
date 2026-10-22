"""
Put the files the phone reads straight from the pbw next to appinfo.json:
the settings page and the plugin script.

Newer Pebble phone apps open the page named by appinfo.json `configPage`
straight out of the pbw and let it message the app's JS while it is open,
and run the script named by `plugin.script` as a plugin. `pebble build` only
bundles the binaries, resources and the watch app's JS, so these are added
once the bundle step has run. Phone apps that predate the keys ignore both
them and the extra files, and keep opening the hosted copy of the page.

The page is whichever config/vN.html Constants.js names as CONFIG_PAGE_VERSION,
so the hosted and bundled copies never drift apart. The plugin script is the
one waftools/plugin_script.py built.
"""
import io
import json
import os
import re
import zipfile

from waflib import Logs
from waflib.Configure import conf

CONSTANTS_PATH = os.path.join('src', 'js', 'app', 'Constants.js')
CONFIG_PAGE_ENTRY = 'config.html'

# The phone only loads a plugin from a pbw that declares its permissions
PLUGIN_MANIFEST_VERSION = 2


def config_page_source(root):
    with io.open(os.path.join(root, CONSTANTS_PATH), encoding='utf-8') as constants:
        match = re.search(r"CONFIG_PAGE_VERSION:\s*['\"]([^'\"]+)['\"]", constants.read())
    if not match:
        raise ValueError('CONFIG_PAGE_VERSION not found in ' + CONSTANTS_PATH)
    return os.path.join(root, 'config', match.group(1))


def read_appinfo(pbw_path):
    with zipfile.ZipFile(pbw_path, 'r') as pbw:
        return json.loads(pbw.read('appinfo.json').decode('utf-8'))


def add_files(pbw_path, files, appinfo_changes):
    """
    Rewrite the pbw with `files` ({entry name: path}) at its root and
    `appinfo_changes` applied to its appinfo.json. Rewriting rather than
    appending keeps a rebuild from stacking copies.
    """
    contents = {}
    for name, path in files.items():
        with io.open(path, 'rb') as source:
            contents[name] = source.read()

    with zipfile.ZipFile(pbw_path, 'r') as source:
        entries = [(info, source.read(info.filename))
                   for info in source.infolist() if info.filename not in contents]

    replacement = pbw_path + '.tmp'
    with zipfile.ZipFile(replacement, 'w', zipfile.ZIP_DEFLATED) as target:
        for info, data in entries:
            if info.filename == 'appinfo.json':
                appinfo = json.loads(data.decode('utf-8'))
                if any(appinfo.get(key) != value for key, value in appinfo_changes.items()):
                    appinfo.update(appinfo_changes)
                    data = json.dumps(appinfo, indent=2, sort_keys=True).encode('utf-8')
            target.writestr(info, data)
        for name in sorted(contents):
            target.writestr(name, contents[name])

    os.remove(pbw_path)
    os.rename(replacement, pbw_path)


@conf
def bundle_pbw_files(ctx, plugin_script=None):
    """
    Add the settings page, and the plugin script when appinfo.json declares a
    plugin, to every pbw in the build directory.
    @param plugin_script: the node of the built plugin script
    """
    root = ctx.path.abspath()
    try:
        page_path = config_page_source(root)
    except (IOError, OSError, ValueError) as err:
        ctx.fatal('Cannot work out which config page to bundle: %s' % err)
    if not os.path.exists(page_path):
        ctx.fatal('Config page %s does not exist' % os.path.relpath(page_path, root))

    build_dir = ctx.bldnode.abspath()
    pbws = [os.path.join(build_dir, name)
            for name in os.listdir(build_dir) if name.endswith('.pbw')]
    if not pbws:
        ctx.fatal('No pbw found in %s to add the config page to' % build_dir)

    for pbw in pbws:
        appinfo = read_appinfo(pbw)
        files = {CONFIG_PAGE_ENTRY: page_path}
        changes = {'configPage': CONFIG_PAGE_ENTRY}

        plugin = appinfo.get('plugin')
        if isinstance(plugin, dict):
            if appinfo.get('manifestVersion', 1) < PLUGIN_MANIFEST_VERSION:
                ctx.fatal('appinfo.json declares a plugin but its manifestVersion is below %d, '
                          'so the phone would not load it' % PLUGIN_MANIFEST_VERSION)
            if plugin_script is None or not os.path.exists(plugin_script.abspath()):
                ctx.fatal('appinfo.json declares a plugin but no plugin script was built')
            files[plugin.get('script', 'plugin.js')] = plugin_script.abspath()

        add_files(pbw, files, changes)
        for name, path in sorted(files.items()):
            Logs.info('Bundled %s into %s as %s' % (
                os.path.relpath(path, root), os.path.relpath(pbw, root), name))
