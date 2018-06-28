Server Side Rendering with Create React App 🙌
==============================================

This repository was bootstrapped with [Create React App][1], [ejected][3], then configured to perform Server Side 
Rendering (SSR).

If you’re interested in SSR then you’d be aware that Create React App has no plans to include support for it:

> _Ultimately server side rendering is very hard to add in a meaningful way without also taking opinionated decisions. 
> We don’t intend to make such decisions at this time._  — [Dan Abramov][4]

This repository, then, is my minimally-opinionated SSR configuration, sticking closely to Create React App’s style and 
introducing as few new things (packages, code, configuration) as possible.

Philosophy
----------

- **Minimal intervention**: Minimise changes to Create React App’s configuration, so that reviewing [the diff][5] can 
  clearly illustrate the requirements of SSR;
- **Developer experience**: Retain the cohesive curated experience provided by Create React App - in particular, you 
  shouldn’t need to do a production build to test your SSR code path.

How to use it
-------------

1. Follow the Create React App [instructions][2] to create a new project;
2. [Eject][3];
3. View [the diff][5] and apply the same changes to your project, by hand or [as a patch][6];
4. Run `yarn` to update dependencies;
5. Run `yarn start` or `yarn build` as normal.

> **Note**: the diff and patch links here compare the HEAD of the master branch to the [commit][7] immediately after 
> ejecting, so they will stay up to date if/when new commits are pushed to this repo.

I recommend applying the changes by hand, rather than forking or otherwise copying this repo, so that you benefit from 
the latest version of Create React App (and to see first-hand what the configuration changes are!).

If you use [the patch][6], be sure to review the changes after applying, to make sure it all makes sense with the 
current version of Create React App’s scripts and configuration.

Running in production
---------------------

To run in production, run `yarn build` then deploy at least the following files and folders:

- `build/`
- `config/`
- `scripts/`
- `package.json`
- `yarn.lock`

If the server’s environment has `NODE_ENV=production` set, then run `yarn install` to install dependencies then use
`node scripts/start.js` (or `yarn start`) to launch the server process (which you’ll probably want to do via tools like 
[Nodemon][23] and [pm2][24]).

If your server doesn’t already have `NODE_ENV=production` set in its environment, then use `yarn install --prod` and 
`NODE_ENV=production node scripts/start.js` (or `yarn start:prod`) instead.

> **Note**: the dependencies in `package.json` have been split into devDependencies and normal runtime dependencies, 
> so running `yarn install --prod` (or running with `NODE_ENV=production`) will not install any libraries that aren’t
> needed in a production environment. That mostly means the webpack infrastructure.

Things to ignore in the diff
----------------------------

- `README.md` (the file you’re reading now)
- `.editorconfig` (although I do recommend [using one][8])
- version numbers in `package.json` (use `yarn add` to add the new dependencies so you get the current versions)
- `yarn.lock` (yours will be regenerated when you run `yarn`)

How it works
------------

### Overview

- `yarn start` is used for both the local dev server (the default) and in production;
- The file `index.html` is removed, and the html received by the browser is constructed instead by the express 
  middleware in `src/server/index.js` (including pre-rendering the React component tree on the server) in both local dev 
  and production;
- In the client code, `ReactDOM.render()` is changed to `ReactDOM.hydrate()`;
- `yarn build` is used (as usual) to prepare a build for production, and must be run before `yarn start` can be used
  in production;
- During local development, code changes are automatically recompiled and reloaded in your browser - even the code in 
  `src/server/`. 
  
> **Note**: As with Create React App, only CSS changes are hot-reloaded without a browser refresh. Try 
> [react-hot-loader][13] and [webpack-hot-middleware][14] if you’re interested in improving your hot-module-replacement
> experience.

### Webpack configuration

- `webpack.config.dev.js` and `webpack.config.prod.js` are each changed to export an [[array] of configurations][12], 
  containing configuration for the client and server builds respectively;
- The configurations are named `client` and `server`, which is a requirement of [webpack-hot-server-middleware][11];
- Configuration related to the `index.html` file is deleted;
- The [stats-webpack-plugin][18] is added to the production config (so that the server can find out things, like the
  filenames of generated assets, at runtime);
- The dev and prod server configurations are created by copying the respective client configurations and then changing 
  some things. The changes are done by code in `config/webpack.config.server.common.js` and mostly involve disabling 
  tasks that don’t need to be repeated in the server build:
  - don’t emit static assets (images, css etc.);
  - don’t build the [service worker][15] file;
  - don’t minify the code;
  - don’t inline `process.env` settings into the bundle.

### `config/webpackDevServer.config.js`

- Get the client configuration from the configuration array now that the project uses [multiple configurations][12];
- Turn off the [history API fallback][16], because that is now the responsibility of the server code in `src/server/`;
- Change the order in which the Webpack Dev Server initializes things, for compatibility with 
  [webpack-hot-server-middleware][11] (explained in more detail [in a comment][17]).

### `scripts/start.js`

The code that is specific to local development has been moved into `scripts/server.dev.js`, so that `start.js` can be 
used to start the server in production as well. 

### `scripts/server.dev.js`

Initializes the Webpack Dev Server. Unfortunately I couldn’t find a good way to link to a visual diff between the
original `start.js` and the new `server.dev.js` but if you use a tool of your own, such as the compare function in an 
IDE, you’ll see that it is made up of fragments from the original `start.js` with only a few additions:

- Use the `after` hook to mount the [webpack-hot-server-middleware][11], and the same error handling middleware that 
  will be used in production;
- Add a workaround to fix hot replacement of CSS changes, due to the Webpack Dev Server’s hot replacement code not 
  handling [multiple configurations][12] correctly.

### `scripts/server.prod.js`

This file is all new, and basically it initializes an [Express][19] server to:

- serve the static assets generated by the client build, and 
- pass all other requests through to the SSR middleware in `src/server/index.js`.

It also includes a quick check that you’ve run `yarn build`, and if the assets aren’t found then it attempts to run the 
build script itself before proceeding. 

> **Note**: This automatic build won’t work if `yarn install` was executed in an environment where `NODE_ENV` was set to
> `production`, because the webpack infrastructure won’t be present.

### `scripts/build.js`

- Remove references to `index.html`;
- Use the client configuration when measuring asset sizes, now that the project uses [multiple configurations][12].

### The SSR middleware: `src/server/*`

This code is all new, with the most interesting work happening in `src/server/middleware/render.js`. That’s where the
html is constructed by:

- Constructing `<link>` tags for any CSS assets output by the build (code adapted from [html-webpack-plugin][20]);
- Constructing a `<script>` tag for the main client bundle;
- Populating React’s mount `<div>` with the output from `renderToString()`.

You’ll want to add things like [prerendered Redux state][21], or prerendered CSS from a CSS-in-JS technology like 
[JSS][22], here.

Known issues
------------

During local development, you will see a [FOUC][25] (Flash Of Unstyled Content) between the browser’s initial paint and
when the client Javascript inserts the CSS into the DOM. This does not occur in production.
 
The FOUC is inherent to the CSS configuration adopted by Create React App (i.e. the use of [style-loader][26] to support 
hot module replacement during development), but it isn’t an issue without SSR because without SSR you can’t see anything 
at all until the client Javascript has executed!

Personally, in my projects I delete the CSS configuration and use [JSS][27] instead. Although, hot module replacement 
isn’t working with react-jss at the time of writing anyway ([this pull request][28] should fix it).

Acknowledgements
----------------

Many thanks to [@faceyspacey][9] for [universal-demo][10], which introduced me to [webpack-hot-server-middleware][11] 
and the idea of using [multiple Webpack configurations][12] to build the client and server code at the same time 👍.





[1]: https://github.com/facebook/create-react-app
[2]: https://github.com/facebook/create-react-app#creating-an-app
[3]: https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#npm-run-eject
[4]: https://github.com/facebook/create-react-app/issues/990#issuecomment-257172453
[5]: https://github.com/felthy/create-react-app-ssr-config/compare/b294b0504c178abe8372cbc9fde8083e1fa75628...master
[6]: https://github.com/felthy/create-react-app-ssr-config/compare/b294b0504c178abe8372cbc9fde8083e1fa75628...master.patch
[7]: https://github.com/felthy/create-react-app-ssr-config/commit/b294b0504c178abe8372cbc9fde8083e1fa75628
[8]: https://editorconfig.org/
[9]: https://github.com/faceyspacey
[10]: https://github.com/faceyspacey/universal-demo
[11]: https://github.com/60frames/webpack-hot-server-middleware
[12]: https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations
[13]: https://github.com/webpack-contrib/webpack-hot-middleware
[14]: https://github.com/gaearon/react-hot-loader
[15]: https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#making-a-progressive-web-app
[16]: https://github.com/webpack/webpack-dev-server/tree/master/examples/cli/history-api-fallback
[17]: https://github.com/felthy/create-react-app-ssr-config/blob/master/config/webpackDevServer.config.js#L92
[18]: https://github.com/unindented/stats-webpack-plugin
[19]: https://expressjs.com/
[20]: https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L406
[21]: https://redux.js.org/recipes/server-rendering#preparing-the-initial-state
[22]: http://cssinjs.org/server-side-rendering/
[23]: https://nodemon.io/
[24]: http://pm2.keymetrics.io/
[25]: https://en.wikipedia.org/wiki/Flash_of_unstyled_content
[26]: https://github.com/webpack-contrib/style-loader/issues/107
[27]: https://github.com/cssinjs/react-jss
[28]: https://github.com/cssinjs/react-jss/pull/123
