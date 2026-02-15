const cheerio = require("cheerio");
const { getCache, setCache } = require("../config/cache");
const { logger } = require("../config/logger");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const cacheDuration = 30 * 60 * 1000; // 30 menit (Puppeteer berat, jadi cache lebih lama)

async function getBrowser() {
    const launchOptions = {
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        ignoreHTTPSErrors: true
    };

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        const chromium = require('@sparticuz/chromium');
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = chromium.args;
        launchOptions.defaultViewport = chromium.defaultViewport;
        launchOptions.headless = chromium.headless;
    }

    return await puppeteer.launch(launchOptions);
}

async function fetchWithPuppeteer(url, waitForSelector = 'body') {
    let browser = null;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Block resources to speed up - DISABLED for debugging frame detached
        /*
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (['font', 'image', 'media'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });
        */

        logger.info(`Extracting: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            await page.waitForSelector(waitForSelector, { timeout: 30000 });
        } catch (e) {
            logger.warn(`Selector ${waitForSelector} not found, continuing anyway`);
        }

        const content = await page.content();
        return content;
    } catch (error) {
        logger.error(`Puppeteer error for ${url}: ${error.message}`);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

async function fetchComicsList(baseUrl, params = {}) {
    const { page = 1 } = params;
    // Use homepage for page 1 as it loads reliably, unlike /explore which often fails hydration
    const url = page === 1 ? baseUrl : `${baseUrl}/explore?page=${page}`;
    const cacheKey = `shinigami:list:${page}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchWithPuppeteer(url, '.grid'); // wait for grid
        const $ = cheerio.load(html);
        const comics = [];

        // Selectors based on rendered HTML logic (need to be generic enough)
        // Looking at rendered html, items are likely in a grid.
        // Example: <div class="bg-base-card ..."> <a href="/series/..."> 
        // Adapting to generic selectors found in Svelte apps often means looking for anchors with series

        // We will target the main grid items (often div > col-span > div > a)
        // Let's try to find links containing '/series/'

        // Shinigami list structure: div.flex.flex-col.gap-12 -> card
        $('div.flex.flex-col.gap-12').each((i, el) => {
            const titleEl = $(el).find('a.font-medium');
            const title = titleEl.text().trim();
            const link = titleEl.attr('href');

            if (!title || !link) return;

            // Image is often in background-image of the first anchor
            const coverEl = $(el).find('a[href^="/series/"]').first();
            const style = coverEl.attr('style') || '';
            const imgMatch = style.match(/src\("?((?:https?:\/\/)?[^"]+)"?\)/) || style.match(/background-image:.*url\((?:&quot;|"|')?(.*?)(?:&quot;|"|')?\)/);
            let image = imgMatch ? imgMatch[1] : '';

            // Fallback to img tag if present
            if (!image) {
                const imgTag = $(el).find('img').first();
                if (imgTag.length) {
                    image = imgTag.attr('data-src') || imgTag.attr('src');
                }
            }

            // Also sometimes image is just style: url(...)
            if (!image && style) {
                const simpleMatch = style.match(/url\((.*?)\)/);
                if (simpleMatch) image = simpleMatch[1].replace(/&quot;/g, '');
            }

            const chapterEl = $(el).find('a[href^="/chapter"]').first();
            const chapter = chapterEl.text().trim() || 'Unknown';

            const slug = link.split('/').pop();

            comics.push({
                comicId: slug,
                title: title,
                link: `https://09.shinigami.asia${link}`,
                image: image,
                limit: "Unknown",
                chapter: chapter,
                rating: "0",
                status: "Unknown"
            });
        });

        // Remove duplicates
        const uniqueComics = comics.filter((v, i, a) => a.findIndex(v2 => (v2.comicId === v.comicId)) === i);

        setCache(cacheKey, uniqueComics, cacheDuration);
        return uniqueComics;
    } catch (error) {
        logger.error(`Shinigami fetch list error: ${error.message}`);
        throw error;
    }
}

async function fetchComicDetail(slug) {
    const url = `https://09.shinigami.asia/series/${slug}`;
    const cacheKey = `shinigami:detail:${slug}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchWithPuppeteer(url, 'a[href^="/chapter/"]');
        const $ = cheerio.load(html);

        const title = $('h1').text().trim();
        const subTitle = $('h3').first().text().trim(); // Korean/Alt title
        // Description sometimes behaves oddly with nested p tags in Cheerio
        // Fallback to targeting the specific container's paragraphs
        const description = $('.markdown-content').text().trim() || $('.py-12 .gap-24 p').text().trim();
        const image = $('.w-180 img').attr('src');

        let author = "Unknown";
        let artist = "Unknown";
        let status = "Unknown";
        let type = "Unknown";
        const genres = [];

        // Metadata extraction
        $('.flex.gap-16.text-base-white').each((i, el) => {
            const label = $(el).find('span').first().text().trim().toLowerCase();
            const values = [];
            $(el).find('button').each((j, btn) => {
                values.push($(btn).text().trim());
            });
            const valueStr = values.join(', ');

            if (label.includes('author')) author = valueStr;
            if (label.includes('artist')) artist = valueStr;
            if (label.includes('status')) status = valueStr;
            if (label.includes('type') || label.includes('format')) type = valueStr;
            if (label.includes('genre')) {
                values.forEach(v => genres.push(v));
            }
        });

        // Chapters
        const chapters = [];
        $('a[href^="/chapter/"]').each((i, el) => {
            const link = $(el).attr('href');
            const id = link.split('/').pop();
            const chTitle = $(el).find('h5').text().trim();
            const date = $(el).find('p').text().trim();

            // Determine invalid chapter (sometimes there are ads masquerading or other links)
            if (id && chTitle) {
                chapters.push({
                    chapterId: id, // Renamed from 'id' to 'chapterId' for consistency
                    title: chTitle,
                    link: `https://09.shinigami.asia${link}`,
                    releaseTime: date // Renamed from 'releaseDate' to 'releaseTime' for consistency
                });
            }
        });

        const info = {
            comicId: slug,
            title: title,
            subTitle: subTitle,
            coverImage: image,
            synopsis: description,
            chapters: chapters,
            type: type,
            author: author,
            artist: artist,
            status: status === "Unknown" ? "Ongoing" : status,
            genres: genres,
            rating: "0" // Retained from old structure
        };

        setCache(cacheKey, info, cacheDuration);
        return info;
    } catch (error) {
        logger.error(`Shinigami fetch detail error: ${error.message}`);
        throw error;
    }
}

async function fetchChapterContent(seriesSlug, chapterSlug) {
    const url = `https://09.shinigami.asia/chapter/${chapterSlug}`; // Note: URL might not need seriesSlug
    const cacheKey = `shinigami:chapter:${chapterSlug}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchWithPuppeteer(url, 'div.flex.flex-col.items-center img');
        const $ = cheerio.load(html);

        const images = [];
        // Images are inside a button with class max-w-800...
        $('.max-w-800.mx-auto.w-full.flex.flex-col.items-center.gap-0 img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !src.includes('svg') && !src.includes('logo')) {
                images.push(src);
            }
        });

        // Unique images only
        const uniqueImages = [...new Set(images)];

        const data = {
            chapterId: chapterSlug,
            seriesId: seriesSlug,
            title: `Chapter ${chapterSlug}`,
            images: uniqueImages,
            nextChapter: null, // Need logic to find prev/next based on UI
            previousChapter: null
        };

        setCache(cacheKey, data, cacheDuration);
        return data;
    } catch (error) {
        logger.error(`Shinigami chapter error: ${error.message}`);
        throw error;
    }
}

async function fetchSearchResults(query) {
    const url = `https://09.shinigami.asia/search?q=${encodeURIComponent(query)}`;

    try {
        return await fetchComicsList('https://09.shinigami.asia', { page: 1 });
        // Note: Real search logic needs to handle search page params. 
        // Shinigami Puppeteer rendering of search results will use same list parser usually.
    } catch (error) {
        return [];
    }
}

module.exports = {
    fetchComicsList,
    fetchComicDetail,
    fetchChapterContent,
    fetchSearchResults
};
