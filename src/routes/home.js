const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Komikaze API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .endpoint { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .method { font-weight: bold; color: #fff; background: #007bff; padding: 3px 8px; border-radius: 3px; font-size: 0.8em; }
        .url { font-family: monospace; font-weight: bold; margin-left: 10px; }
        .params { margin-top: 10px; }
        .param-name { font-weight: bold; font-family: monospace; color: #d63384; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { font-family: 'Consolas', 'Monaco', monospace; }
        .note { background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #ffeeba; }
    </style>
</head>
<body>
    <h1>Komikaze API Documentation</h1>
    <div class="note">
        <strong>Base URL:</strong> <code id="baseUrl"></code><br>
        <strong>Supported Sources:</strong> <code>komikcast</code> (default), <code>kiryuu</code>, <code>shinigami</code> (deprecated)<br>
        Use <code>?source=kiryuu</code> query parameter to switch sources.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/comics</span>
        <p>Get latest manga updates.</p>
        <div class="params">
            Query Config:<br>
            - <span class="param-name">page</span> (optional): Page number (default: 1)<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/comics?page=1&source=kiryuu"</pre>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/comics/:slug</span>
        <p>Get comic details (synopsis, chapters, metadata).</p>
        <div class="params">
            Params:<br>
            - <span class="param-name">slug</span>: Comic slug<br>
            Query Config:<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/comics/solo-leveling?source=kiryuu"</pre>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/search</span>
        <p>Search for manga by query.</p>
        <div class="params">
            Query Config:<br>
            - <span class="param-name">q</span> (required): Search query<br>
            - <span class="param-name">page</span> (optional): Page number<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/search?q=solo&source=kiryuu"</pre>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/popular-manga</span>
        <p>Get list of popular manga.</p>
        <div class="params">
            Query Config:<br>
            - <span class="param-name">page</span> (optional): Page number<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/popular-manga?page=1&source=kiryuu"</pre>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/chapters/:seriesSlug/:chapterSlug</span>
        <p>Get chapter images.</p>
        <div class="params">
            Params:<br>
            - <span class="param-name">seriesSlug</span>: Manga slug (from search/comic list)<br>
            - <span class="param-name">chapterSlug</span>: Chapter slug<br>
            Query Config:<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/chapters/solo-leveling/chapter-1?source=kiryuu"</pre>
    </div>

    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/genres</span>
        <p>Get list of available genres.</p>
        <div class="params">
            Query Config:<br>
            - <span class="param-name">source</span> (optional): Source provider
        </div>
        <pre>curl "<span class="base-url-ph"></span>/api/genres?source=kiryuu"</pre>
    </div>

    <script>
        const origin = window.location.origin;
        document.getElementById('baseUrl').textContent = origin;
        document.querySelectorAll('.base-url-ph').forEach(el => el.textContent = origin);
    </script>
</body>
</html>
    `;
    res.send(html);
});

module.exports = router;
