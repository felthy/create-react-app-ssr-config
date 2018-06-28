import React from 'react';
import {renderToString} from 'react-dom/server';
import App from '../../App';
import asyncHandler from 'express-async-handler';
import uniq from 'lodash/uniq';

function escapeAttr(s) {
    return s && s.replace('"', '&quot;');
}

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
        })
    });

    // Duplicate css assets can occur on occasion if more than one chunk
    // requires the same css.
    return uniq(files).map(file =>
        `<link href="/${escapeAttr(file)}" rel="stylesheet">`
    );
}

async function render({clientStats, serverStats}) {
    const css = getCSS(clientStats).join('');
    const html = renderToString(
        <App />
    );

    return '<!DOCTYPE html>' +
        '<html lang="en">' +
          '<head>' +
            '<meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
            '<meta name="theme-color" content="#000000">' +
            // manifest.json provides metadata used when your web app is added to the
            //  homescreen on Android. See https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/
            '<link rel="manifest" href="/manifest.json">' +
            '<link rel="shortcut icon" href="/favicon.ico">' +
            '<title>React App</title>' +
            css +
          '</head>' +
          '<body>' +
            '<noscript>' +
              'You need to enable JavaScript to run this app.' +
            '</noscript>' +
            '<div id="root">' +
                html +
            '</div>' +
            `<script src="/${escapeAttr(clientStats.assetsByChunkName.main[0])}"></script>` +
          '</body>' +
        '</html>';
}

export default function(options) {
    return asyncHandler(async (req, res) => {
        try {
            const html = await render(options);
            res.send(html);
        } catch (err) {
            console.error(err);
            res.status(500).send(err ? err.message : 'Server error');
        }
    })
}
