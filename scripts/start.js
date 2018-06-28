'use strict';

// Do this as the first thing so that any code reading it knows the right env.
const DEV = (process.env.NODE_ENV || 'development') === 'development';
if (DEV) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
}

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const _ = require('lodash');
const chalk = require('chalk');
const choosePort = DEV ? require('react-dev-utils/WebpackDevServerUtils').choosePort : (host, port) => Promise.resolve(port);
const createServer = DEV ? require('./server.dev') : require('./server.prod');


// Tools like Cloud9 rely on this.
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.HOST) {
  console.log(
    chalk.cyan(
      `Attempting to bind to HOST environment variable: ${chalk.yellow(
        chalk.bold(process.env.HOST)
      )}`
    )
  );
  console.log(
    `If this was unintentional, check that you haven't mistakenly set it in your shell.`
  );
  console.log(`Learn more here: ${chalk.yellow('http://bit.ly/2mwWSwH')}`);
  console.log();
}

// We attempt to use the default port but if it is busy, we offer the user to
// run on a different port. `choosePort()` Promise resolves to the next free port.
choosePort(HOST, DEFAULT_PORT)
  .then(port => {
    if (port == null) {
      // We have not found a port.
      return;
    }

    const server = createServer(port, HOST);

    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        console.log(chalk.cyan('\nShutting down...'));
        server.close();
        process.exit();
      });
    });
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
