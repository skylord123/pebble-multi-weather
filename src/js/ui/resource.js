var myutil = require('lib/myutil');
var appinfo = require('appinfo');
var Platform = require('platform');

var resources = (function() {
  var resources = appinfo.resources;
  var media = resources && resources.media || [];
  var platform = Platform.version && Platform.version();
  if (!platform) {
    return media;
  }
  return media.filter(function(item) {
    return !item.targetPlatforms || item.targetPlatforms.indexOf(platform) !== -1;
  });
})();

var Resource = {};

Resource.items = resources;

Resource.getId = function(opt) {
  var path = opt;
  if (typeof opt === 'object') {
    path = opt.url;
  }
  path = path.replace(/#.*/, '');
  var cname = myutil.toCConstantName(path);
  for (var i = 0, ii = resources.length; i < ii; ++i) {
    var res = resources[i];
    if (res.name === cname || res.file === path) {
      return i + 1;
    }
  }
};

module.exports = Resource;
