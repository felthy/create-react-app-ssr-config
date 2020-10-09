'use strict';

require('source-map-support/register');
const chalk = require('react-dev-utils/chalk');
const address = require('address');
const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const createServer = require('http').createServer;

let clientStats, serverStats;

try {
  const buildDir = path.resolve(__dirname, '..', 'build');
  const clientStatsPath = path.resolve(buildDir, 'client', 'stats.json');
  const serverStatsPath = path.resolve(buildDir, 'server', 'stats.json');

  if (!fs.existsSync(clientStatsPath) || !fs.existsSync(serverStatsPath)) {
    // run yarn build if possible
    require('child_process').spawnSync('node', [path.resolve(__dirname, 'build.js')], {
      stdio: [process.stdin, process.stdout, 'ignore']
    });
  }

  clientStats = require('../build/client/stats.json');
  serverStats = require('../build/server/stats.json');
} catch (e) {
  console.warn(chalk.yellow(`Production assets not found, please run ${chalk.bold('yarn build')}.`));
  process.exit(1);
}

const createSSRRouter = require(`../build/server/${serverStats.assetsByChunkName.main[0]}`).default;

function prepareUrls(host, port) {
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const prettyPrintUrl = hostname =>
    url.format({
      protocol,
      hostname,
      port: chalk.bold(port),
      pathname: '/'
    });

  const isUnspecifiedHost = host === '0.0.0.0' || host === '::';
  let prettyHost, lanUrlForConfig, lanUrlForTerminal;
  if (isUnspecifiedHost) {
    prettyHost = 'localhost';
    try {
      // This can only return an IPv4 address
      lanUrlForConfig = address.ip();
      if (lanUrlForConfig) {
        // Check if the address is a private ip
        // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
        if (
          /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(
            lanUrlForConfig
          )
        ) {
          // Address is private, format it for later use
          lanUrlForTerminal = prettyPrintUrl(lanUrlForConfig);
        }
      }
    } catch (_e) {
      // ignored
    }
  } else {
    prettyHost = host;
  }
  const localUrlForTerminal = prettyPrintUrl(prettyHost);
  return {
    lanUrlForTerminal,
    localUrlForTerminal,
  };
}

function printInstructions(port, host) {
  const appName = require('../package.json').name;
  const { localUrlForTerminal, lanUrlForTerminal } = prepareUrls(host, port);

  console.log();
  console.log(`You can now view ${chalk.bold(appName)} in the browser.`);
  console.log();

  if (lanUrlForTerminal) {
    console.log(
      `  ${chalk.bold('Local:')}            ${localUrlForTerminal}`
    );
    console.log(
      `  ${chalk.bold('On Your Network:')}  ${lanUrlForTerminal}`
    );
  } else {
    console.log(`  ${localUrlForTerminal}`);
  }

  console.log();
}

module.exports = function (port, host) {
  const app = express();

  app.on('error', error => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`Port ${port} requires elevated privileges`);
        process.exit(1);
      case 'EADDRINUSE':
        console.error(`Port ${port} is already in use`);
        process.exit(1);
      default:
        throw error;
    }
  })

  // Support Gzip
  app.use(compression());

  app.use(morgan(process.env.NODE_ENV === 'development' && process.stdout.isTTY ? 'dev' : 'combined'));

  const staticOptions = {
    index: false, // don't serve index.html for uris that resolve to directories
    immutable: true, // all static assets have hashes in their filenames
    maxAge: '1 year',
  };
  app.use(express.static(path.resolve(__dirname, '..', 'build', 'client'), staticOptions));
  app.use(express.static(path.resolve(__dirname, '..', 'build', 'server'), staticOptions));

  app.use(createSSRRouter({ clientStats, serverStats }));

  const server = createServer(app);
  server.listen(port, host, err => {
    if (err) {
      return console.log(err);
    }
    printInstructions(port, host);
  });

  return server;
};
