'use strict';

module.exports = function($allonsy, $options, $done) {
  if ((process.env.EVOLV && process.env.EVOLV == 'false') || (!$options.owner || $options.owner != 'start')) {
    return $done();
  }

  var evolv = require('evolv'),
      async = require('async'),
      path = require('path'),
      fs = require('fs-extra'),
      versionsPath = path.resolve('.versions'),
      versions = {};

  (fs.existsSync(versionsPath) ? fs.readFileSync(versionsPath, 'utf-8') : '').split('\n').map(function(version) {
    version = version.split('=');

    if (version.length < 2) {
      return;
    }

    version[0] = version[0].trim();
    version[1] = version[1].trim();

    if (!version[0] || !version[1] || version[0].indexOf('#') === 0) {
      return;
    }

    versions[version[0].trim()] = version[1].trim();
  });

  var pathsToEvolv = [{
    module: 'this',
    path: path.resolve('.')
  }];

  fs.readdirSync(path.resolve('./node_modules/')).forEach(function(folder) {
    if (folder.indexOf('allons-y-') < 0) {
      return;
    }

    pathsToEvolv.push({
      module: folder,
      path: path.resolve('./node_modules/' + folder)
    });
  });

  async.eachSeries(pathsToEvolv, function(pathToEvolv, nextPath) {
    var packageFile = path.join(pathToEvolv.path, 'package.json'),
        moduleVersionsPath = path.resolve(pathToEvolv.path, 'versions');

    if (!fs.existsSync(packageFile)) {
      return nextPath();
    }

    var packageJson = fs.readJsonSync(packageFile);

    if (!packageJson || !packageJson.version) {
      return nextPath();
    }

    versions[pathToEvolv.module] = versions[pathToEvolv.module] || packageJson.version;

    if (versions[pathToEvolv.module] == packageJson.version || !fs.existsSync(moduleVersionsPath)) {
      return nextPath();
    }

    $allonsy.outputInfo('► [Evolve] "' + pathToEvolv.module + '" to ' + packageJson.version + '...', false);

    evolv({
      path: moduleVersionsPath,
      silent: true
    }, versions[pathToEvolv.module], function() {
      $allonsy.outputSuccess(' DONE');

      versions[pathToEvolv.module] = packageJson.version;

      nextPath();
    });

  }, function() {
    fs.writeFileSync(versionsPath,
      '# Ignore this file in your repository\n\n' +
      Object
        .keys(versions)
        .map(function(key) {
          return key + '=' + versions[key];
        })
        .join('\n')
    );

    $done();
  });
};
