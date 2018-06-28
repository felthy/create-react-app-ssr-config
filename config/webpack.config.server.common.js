const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const paths = require('./paths');

module.exports = function(config) {
  config.name = 'server';
  config.target = 'node';
  config.entry = [path.resolve(paths.appSrc, 'server', 'index.js')];
  config.output.path = path.resolve(paths.appBuild, 'server');
  config.output.filename = '[name].js';
  config.output.chunkFilename = '[name].chunk.js';
  config.output.libraryTarget = 'commonjs2';

  // There's no need to bundle code from node_modules in the server bundle
  // because the NodeJS runtime can load them from node_modules itself.
  // There are some modules that won't work correctly if they aren't bundled
  // though (such as react-universal-component, webpack-flush-chunks and
  // require-universal-module) so we specifically exclude those here as an
  // example even though this project doesn't include them.
  config.externals = fs
    .readdirSync(paths.appNodeModules)
    .filter(x => !/\.bin|react-universal-component|require-universal-module|webpack-flush-chunks/.test(x))
    .reduce((externals, mod) => {
      externals[mod] = `commonjs ${mod}`
      return externals
    }, {});

  // don't emit any code for css modules on the server
  config.module.rules.forEach(rule => {
    const loaders = rule.use || rule.oneOf;
    if (loaders.length) {
      loaders.forEach(loader => {
        if (loader.test && loader.test.source && loader.test.source.indexOf('css') >= 0) {
          delete loader.use; // does nothing in prod
          loader.loader = require.resolve('null-loader');
        }
      });
    }
  });

  // stop the file loader from emitting files into server/static
  config.module.rules.forEach(rule => {
    const loaders = rule.use || rule.oneOf;
    if (loaders.forEach) {
      loaders.forEach(loader => {
        if (loader.loader === require.resolve('file-loader')) {
          loader.options.emitFile = false;
        }
      })
    }
  })

  // remove unwanted plugins
  _.remove(config.plugins, plugin =>
    plugin instanceof webpack.DefinePlugin ||
    plugin instanceof webpack.optimize.UglifyJsPlugin ||
    plugin instanceof ExtractTextPlugin ||
    plugin instanceof SWPrecacheWebpackPlugin
  );

  config.node = {
    // we want __dirname to point to the actual filesystem path instead of output.publicPath
    __dirname: false,
    __filename: false,
  };

  return config;
};
