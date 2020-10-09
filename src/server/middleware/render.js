import React from 'react';
import { oneLineTrim, safeHtml } from 'common-tags';
import { renderToString } from 'react-dom/server';
import App from '../../App';
import asyncHandler from 'express-async-handler';
import uniq from 'lodash/uniq';

function getCSS(clientStats) {
  const chunks = clientStats.chunks
    .filter(chunk => chunk.names[0] && chunk.initial)
    .sort((a, b) => {
      if (a.entry !== b.entry) {
        return b.entry ? 1 : -1;
      } else {
        return b.id - a.id;
      }
    });

  const files = [];
  chunks.forEach(chunk => {
    [].concat(chunk.files).forEach(file => {
      // Some chunks may contain content hash in their names, for ex. 'main.css?1e7cac4e4d8b52fd5ccd2541146ef03f'.
      // We must proper handle such cases, so we use regexp testing here
      if (/.css($|\?)/.test(file)) {
        files.push(file);
      }
    });
  });

  // Duplicate css assets can occur on occasion if more than one chunk
  // requires the same css.
  return uniq(files).map(file =>
    safeHtml`<link href="/${file}" rel="stylesheet">`
  );
}

/**
 * Renders <script> tags for all required javascript files.
 * Based on the htmlWebpackPluginAssets() method in html-webpack-plugin.
 *
 * @param clientStats bundle stats as output by webpack
 * @returns {string} <script> tags suitable for inserting at the bottom of the html body.
 */
function getScripts (clientStats) {
  const entryNames = Array.from(Object.keys(clientStats.entrypoints));
  const publicPath = clientStats.publicPath;
  const js = [];

  // Extract paths to .js, .mjs and .css files from the current compilation
  const entryPointPublicPathMap = {};
  const extensionRegexp = /\.(js|mjs)(\?|$)/;
  for (let i = 0; i < entryNames.length; i++) {
    const entryName = entryNames[i];
    const entryPointFiles = clientStats.entrypoints[entryName].assets;
    // Prepend the publicPath and append the hash depending on the
    // webpack.output.publicPath and hashOptions
    // E.g. bundle.js -> /bundle.js?hash
    const entryPointPublicPaths = entryPointFiles
      .map(chunkFile => {
        return publicPath + chunkFile;
      });

    entryPointPublicPaths.forEach((entryPointPublicPath) => {
      const extMatch = extensionRegexp.exec(entryPointPublicPath);
      // Skip if the public path is not a .css, .mjs or .js file
      if (!extMatch) {
        return;
      }
      // Skip if this file is already known
      // (e.g. because of common chunk optimizations)
      if (entryPointPublicPathMap[entryPointPublicPath]) {
        return;
      }
      entryPointPublicPathMap[entryPointPublicPath] = true;
      js.push(entryPointPublicPath);
    })
  }
  return js.map(src => safeHtml`<script src="${src}"></script>`).join('')
}

async function render ({ clientStats, serverStats, initialEntries }) {
  const renderedHtml = renderToString(
    <App />
  );

  const css = getCSS(clientStats).join('');
  const scripts = getScripts(clientStats);
  const publicUrl = clientStats.publicPath.slice(0, -1);

  const html = oneLineTrim`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${safeHtml`
          <meta charset="utf-8" />
          <link rel="icon" href="${publicUrl}/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <meta name="description" content="Web site created using create-react-app" />
          <link rel="apple-touch-icon" href="${publicUrl}/logo192.png" />
          ${/*
            manifest.json provides metadata used when your web app is installed on a
            user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/
          */''}
          <link rel="manifest" href="${publicUrl}/manifest.json" />
          ${/*
            Notice the use of ${publicUrl} in the tags above.
            It will be replaced with the URL of the `public` folder during the build.
            Only files inside the `public` folder can be referenced from the HTML.

            Unlike "/favicon.ico" or "favicon.ico", "${publicUrl}/favicon.ico" will
            work correctly both with client-side routing and a non-root public URL.
            Learn how to configure a non-root public URL by running `npm run build`.
          */''}
          <title>React App</title>
        `}
        ${css}
      </head>
      <body>
        ${/*
          With SSR, your users might not need JavaScript enabled to use your app,
          for example this starter app is 100% functional without Javascript.

          You may want to add <noscript> content if your app needs it.

          <noscript>You need to enable JavaScript to run this app.</noscript>
        */''}
        <div id="root">
          ${renderedHtml}
        </div>
        ${scripts}
      </body>
    </html>
  `;

  return html;
}

export default function (options) {
  return asyncHandler(async (req, res) => {
    try {
      const html = await render({ ...options, initialEntries: req.originalUrl });
      res.send(html);
    } catch (err) {
      console.error(err);
      res.status(500).send(err ? err.message : 'Server error');
    }
  });
}
