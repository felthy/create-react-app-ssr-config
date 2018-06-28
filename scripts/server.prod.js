'use strict';

const chalk = require('chalk');
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
  const buildDir = path.resolve(__dirname, '..', 'build'),
    clientStatsPath = path.resolve(buildDir, 'client', 'stats.json'),
    serverStatsPath = path.resolve(buildDir, 'server', 'stats.json');

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

function formatUrls(host, port) {
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
  const prettyPrintUrl = hostname =>
    url.format({
      protocol,
      hostname,
      port: chalk.bold(port),
      pathname: '/',
    });

  const isUnspecifiedHost = host === '0.0.0.0' || host === '::';
  let lan;
  if (isUnspecifiedHost) {
    try {
      // This can only return an IPv4 address
      const ip = address.ip();
      if (ip) {
        // Check if the address is a private ip
        // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
        if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(ip)) {
          // Address is private, format it for later use
          lan = prettyPrintUrl(ip);
        }
      }
    } catch (_e) {
      // ignored
    }
  }
  return {
    lan,
    local: prettyPrintUrl(isUnspecifiedHost ? 'localhost' : host),
  };
}

function printInstructions(port, host) {
  const appName = require('../package.json').name;
  const {local, lan} = formatUrls(host, port);

  console.log();
  console.log(`You can now view ${chalk.bold(appName)} in the browser.`);
  console.log();

  if (lan) {
    console.log(
      `  ${chalk.bold('Local:')}            ${local}`
    );
    console.log(
      `  ${chalk.bold('On Your Network:')}  ${lan}`
    );

  } else {
    console.log(`  ${local}`);
  }
  console.log();
}

module.exports = function(port, host) {
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
        break;
      case 'EADDRINUSE':
        console.error(`Port ${port} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Support Gzip
  app.use(compression());

  app.use(morgan(process.env.NODE_ENV === 'development' && process.stdout.isTTY ? 'dev' : 'combined'));

  app.use(express.static(path.resolve(__dirname, '..', 'build', 'client'), {
    index: false, // don't serve index.html for uris that resolve to directories
  }));

  app.use(createSSRRouter({clientStats, serverStats}));

  const server = createServer(app);
  server.listen(port, host, err => {
    if (err) {
      return console.log(err);
    }
    printInstructions(port, host);
  })

  return server;
}
