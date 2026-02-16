const cheerio = require("cheerio");
const axios = require("axios");
const { getCache, setCache } = require("../config/cache");
const { logger } = require("../config/logger");

const BASE_URL = "https://kiryuu03.com";
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Fix for Vercel/Serverless deployment: Explicitly require evasions so they are bundled
require('puppeteer-extra-plugin-user-preferences');
require('puppeteer-extra-plugin-user-data-dir');
require('puppeteer-extra-plugin-stealth/evasions/chrome.app');
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi');
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes');
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime');
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs');
require('puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow');
require('puppeteer-extra-plugin-stealth/evasions/media.codecs');
require('puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency');
require('puppeteer-extra-plugin-stealth/evasions/navigator.languages');
require('puppeteer-extra-plugin-stealth/evasions/navigator.permissions');
require('puppeteer-extra-plugin-stealth/evasions/navigator.plugins');
require('puppeteer-extra-plugin-stealth/evasions/navigator.vendor');
require('puppeteer-extra-plugin-stealth/evasions/navigator.webdriver');
require('puppeteer-extra-plugin-stealth/evasions/sourceurl');
require('puppeteer-extra-plugin-stealth/evasions/user-agent-override');
require('puppeteer-extra-plugin-stealth/evasions/webgl.vendor');
require('puppeteer-extra-plugin-stealth/evasions/window.outerdimensions');

puppeteer.use(StealthPlugin());
const cacheDuration = 15 * 60 * 1000; // 15 menit

const defaultHeaders = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Referer: BASE_URL + "/",
};

/**
 * Fetch HTML dari URL dengan axios
 */
async function fetchHTML(url, params = {}, axiosConfig = {}) {
    logger.info(`Fetching: ${url}`);
    const response = await axios.get(url, {
        headers: defaultHeaders,
        params,
        timeout: 30000,
        ...axiosConfig
    });

    return response.data;
}

async function getBrowser() {
    const launchOptions = {
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--window-size=1920,1080'
        ],
        ignoreHTTPSErrors: true,
        userDataDir: './session' // Persist session (cookies, etc)
    };

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        const chromium = require('@sparticuz/chromium');
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = [...chromium.args, '--window-size=1920,1080'];
        launchOptions.defaultViewport = chromium.defaultViewport;
        launchOptions.headless = chromium.headless;
        // On Vercel, use /tmp for userDataDir
        launchOptions.userDataDir = '/tmp/session';
    }

    return await puppeteer.launch(launchOptions);
}

async function fetchWithPuppeteer(url) {
    let browser = null;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        logger.info(`Puppeteer extracting: ${url}`);

        // Block resource berat (font, image, css) untuk mempercepat loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['font', 'stylesheet', 'image', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            // waitUntil: 'domcontentloaded' is faster than networkidle
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        } catch (e) {
            logger.warn(`Puppeteer goto error: ${e.message}`);
            // Continue as sometimes goto throws but page is loaded or loading
        }

        // Wait for content to load (try to find images or title)
        try {
            // Wait for either main images or title, but exclude Cloudflare/404 titles
            await page.waitForFunction(() => {
                const h1 = document.querySelector('h1');
                const h1Text = h1 ? h1.innerText.trim().toLowerCase() : '';
                const unwanted = ['404 not found', 'just a moment...', 'attention required!', 'access denied'];
                const isBadTitle = unwanted.some(s => h1Text.includes(s));

                // On chapter page: main img. On list/home page: .listupd or .bs (manga card)
                const hasImages = document.querySelectorAll('main img').length > 0;
                const hasList = document.querySelectorAll('.listupd, .bs, .hentry').length > 0;
                const hasGoodTitle = h1 && !isBadTitle;

                return hasImages || hasList || hasGoodTitle;
            }, { timeout: 30000 });
        } catch (e) {
            logger.warn('Content selector not found, trying to reload...');
            try {
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
                await page.waitForFunction(() => {
                    const h1 = document.querySelector('h1');
                    const h1Text = h1 ? h1.innerText.trim().toLowerCase() : '';
                    const unwanted = ['404 not found', 'just a moment...', 'attention required!', 'access denied'];
                    const isBadTitle = unwanted.some(s => h1Text.includes(s));

                    const hasImages = document.querySelectorAll('main img').length > 0;
                    const hasList = document.querySelectorAll('.listupd, .bs, .hentry').length > 0;
                    const hasGoodTitle = h1 && !isBadTitle;

                    return hasImages || hasList || hasGoodTitle;
                }, { timeout: 30000 });
            } catch (retryError) {
                logger.error(`Retry failed: ${retryError.message}`);
            }
        }

        // Retry getting content if detached frame (page reloading)
        let content = '';
        for (let i = 0; i < 3; i++) {
            try {
                content = await page.content();
                break;
            } catch (e) {
                if (e.message.includes('detached') || e.message.includes('destroyed') || e.message.includes('Execution context was destroyed')) {
                    logger.warn(`Frame detached during content extraction, retrying ${i + 1}/3...`);
                    await new Promise(r => setTimeout(r, 5000)); // Wait 5s

                    // Try to get page again, maybe reload if needed?
                    // No, just wait.
                } else {
                    throw e;
                }
            }
        }

        if (!content) {
            logger.error("Failed to get content after retries. Taking screenshot...");
            try {
                await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
            } catch (scrErr) {
                logger.error("Failed to take screenshot: " + scrErr.message);
            }
            throw new Error("Frame detached/destroyed persistently. Cloudflare loop?");
        }

        return content;
    } catch (error) {
        // Try to take screenshot on general error if browser is open
        if (browser) {
            try {
                // Must get pages to find the active one
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: 'error_screenshot.png' });
                }
            } catch (scErr) { }
        }
        logger.error(`Puppeteer error for ${url}: ${error.message}`);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Parse manga items dari halaman yang berisi daftar manga
 * Dipakai untuk list, search, dan genre pages
 */
function parseMangaItems($) {
    const comics = [];
    const seen = new Set();

    $('a[href*="/manga/"]').each((i, el) => {
        const href = $(el).attr("href");
        if (!href || !href.match(/\/manga\/[^/]+\/$/) || href.includes("/genre/"))
            return;

        const slug = href.replace(/\/$/, "").split("/").pop();
        if (seen.has(slug)) return;
        seen.add(slug);

        // Cari gambar cover
        const img = $(el).find("img").first();
        let image = "";
        if (img.length) {
            image = img.attr("data-src") || img.attr("src") || "";
        }

        // Cari judul — cek berbagai sumber
        const title =
            $(el).attr("title") ||
            $(el).find("h1, h2, h3, h4, span").first().text().trim() ||
            (img.length ? (img.attr("alt") || "") : "") ||
            slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        if (!title) return;

        // Cari info chapter terdekat
        const wrapper = $(el).closest("div");
        let chapter = "Unknown";
        const chLink = wrapper.find('a[href*="/chapter-"]').first();
        if (chLink.length) {
            chapter = chLink.text().trim().replace(/\s+/g, " ");
        }

        comics.push({
            comicId: slug,
            title: title,
            link: href,
            image: image,
            limit: "Unknown",
            chapter: chapter,
            rating: "0",
            status: "Unknown",
        });
    });

    return comics;
}

/**
 * Daftar komik (paginated listing dari /manga/)
 * Page 1 menggunakan homepage (karena /manga/ page 1 loading dynamic)
 * Page 2+ menggunakan /manga/page/{n}/
 */
async function fetchComicsList(baseUrl, params = {}) {
    const { page = 1 } = params;
    const url =
        page <= 1 ? BASE_URL : `${BASE_URL}/manga/page/${page}/`;
    const cacheKey = `kiryuu:list:${page}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const comics = parseMangaItems($);

        setCache(cacheKey, comics, cacheDuration);
        logger.info(`Kiryuu list page ${page}: ${comics.length} comics`);
        return comics;
    } catch (error) {
        logger.error(`Kiryuu fetch list error: ${error.message}`);
        throw error;
    }
}

/**
 * Detail komik: judul, cover, sinopsis, genre, chapter list, metadata
 */
async function fetchComicDetail(slug) {
    const url = `${BASE_URL}/manga/${slug}/`;
    const cacheKey = `kiryuu:detail:${slug}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);

        // Judul
        const title = $("h1").first().text().trim();

        // Sub title
        let subTitle = "";
        const altTitleEl = $("h1")
            .first()
            .parent()
            .find("div, span")
            .filter((i, el) => {
                const text = $(el).text().trim();
                return text && text !== title && text.length > 2 && text.length < 200;
            })
            .first();
        if (altTitleEl.length) {
            subTitle = altTitleEl.text().trim();
        }

        // Cover image
        const image =
            $("img.wp-post-image").first().attr("src") ||
            $("img.wp-post-image").first().attr("data-src") ||
            "";

        // Synopsis
        const description = $('[itemprop="description"]').text().trim();

        // Genre
        const genres = [];
        $('a[href*="/genre/"]').each((i, el) => {
            const genre = $(el).text().trim();
            if (genre && !genres.includes(genre)) {
                genres.push(genre);
            }
        });

        // Metadata dari h4 tags
        let type = "Unknown";
        let status = "Unknown";
        let author = "Unknown";
        let artist = "Unknown";

        $("h4").each((i, el) => {
            const label = $(el).text().trim().toLowerCase();
            const valueEl = $(el).next();
            const value = valueEl.text().trim();

            if (label === "type") type = value || type;
            else if (label === "status") status = value || status;
            else if (label === "author" || label === "pengarang")
                author = value || author;
            else if (label === "artist") artist = value || artist;
        });

        // Rating
        const rating = $('[itemprop="ratingValue"]').text().trim() || "0";

        // Chapter list
        const chapters = [];
        const seenChapters = new Set();
        $('a[href*="/chapter-"]').each((i, el) => {
            const href = $(el).attr("href");
            if (!href || seenChapters.has(href)) return;
            seenChapters.add(href);

            const chapterMatch = href.match(/\/(chapter-[^/]+)\/?$/);
            if (!chapterMatch) return;

            const chapterId = chapterMatch[1].replace(/\/$/, "");
            const chTitle =
                $(el).text().trim().replace(/\s+/g, " ") || `Chapter ${chapterId}`;

            // Cari tanggal rilis
            const wrapper = $(el).closest("div");
            let releaseTime = "";
            wrapper.find("span, time, div").each((j, dateEl) => {
                const t = $(dateEl).text().trim();
                if (
                    t.includes("ago") ||
                    t.match(
                        /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
                    ) ||
                    t.match(/^\d{4}/)
                ) {
                    releaseTime = t;
                }
            });

            chapters.push({
                chapterId: chapterId,
                title: chTitle,
                link: href,
                releaseTime: releaseTime,
            });
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
            rating: rating,
        };

        setCache(cacheKey, info, cacheDuration);
        logger.info(
            `Kiryuu detail ${slug}: ${chapters.length} chapters, ${genres.length} genres`
        );
        return info;
    } catch (error) {
        logger.error(`Kiryuu fetch detail error: ${error.message}`);
        throw error;
    }
}

/**
 * Konten chapter: daftar gambar
 */
async function fetchChapterContent(seriesSlug, chapterSlug) {
    const cacheKey = `kiryuu:chapter:${chapterSlug}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const url = `${BASE_URL}/manga/${seriesSlug}/${chapterSlug}/`;
        logger.info(`Fetching chapter: ${url}`);

        // Try fetching with axios first for speed
        let html;
        try {
            // Set timeout shorter (5s) so we can fallback to Puppeteer quickly if blocked/slow
            html = await fetchHTML(url, {}, { timeout: 5000 });
        } catch (e) {
            logger.warn(`Axios fetch failed for ${url} (${e.message}), falling back to Puppeteer...`);
            if (e.response && (e.response.status === 403 || e.response.status === 503)) {
                html = await fetchWithPuppeteer(url);
            } else {
                throw e;
            }
        }

        const $ = cheerio.load(html);

        // Judul chapter
        const title = $("h1").first().text().trim() || `Chapter ${chapterSlug}`;

        // Gambar chapter di <main> tag
        const images = [];

        // 1. Primary search: main images
        $("main img").each((i, el) => {
            const src = $(el).attr("src") || $(el).attr("data-src");
            if (src) {
                const srcLower = src.toLowerCase();
                const alt = ($(el).attr("alt") || "").toLowerCase();
                const cls = ($(el).attr("class") || "").toLowerCase();

                // Filter out iklan/banner/logo
                if (
                    cls.includes("custom-logo") ||
                    alt.includes("logo") ||
                    alt.includes("banner") ||
                    alt.includes("iklan") ||
                    srcLower.includes("banner") ||
                    srcLower.includes("iklan") ||
                    srcLower.includes("logo") ||
                    srcLower.endsWith(".gif")
                ) {
                    return;
                }

                // Filter domain gambar yang valid 
                if (
                    srcLower.includes("envira-cdn") ||
                    srcLower.includes("wp-content/uploads") ||
                    srcLower.includes("imagedelivery") ||
                    srcLower.includes("cdn-cgi") ||
                    srcLower.includes("cdn.uqni.net") ||
                    srcLower.includes("yuucdn.net") ||
                    srcLower.includes("googleusercontent")
                ) {
                    if (!images.includes(src)) {
                        images.push(src);
                    }
                }
            }
        });

        // 2. Fallback: If few images found, search wider but with stricter exclusions
        if (images.length <= 1) {
            $("img").each((i, el) => {
                const src = $(el).attr("src") || $(el).attr("data-src");
                // Avoid duplicates
                if (src && !images.includes(src)) {
                    const srcLower = src.toLowerCase();

                    // Exclude specific unwanted strings
                    if (
                        !srcLower.includes("logo") &&
                        !srcLower.includes("icon") &&
                        !srcLower.includes("avatar") &&
                        !srcLower.includes("banner") &&
                        !srcLower.includes("iklan") &&
                        !srcLower.endsWith(".svg") &&
                        !srcLower.endsWith(".gif")
                    ) {
                        // Check for common chapter image patterns
                        if (
                            srcLower.includes("chapter") ||
                            /\/\d+\.(jpg|jpeg|png|webp)/.test(srcLower) ||
                            srcLower.includes("cdn.uqni.net") ||
                            srcLower.includes("yuucdn.net") // Ensure these are picked up even if outside main
                        ) {
                            images.push(src);
                        }
                    }
                }
            });
        }
        // Next/prev chapter
        let nextChapter = null;
        let previousChapter = null;

        $("a").each((i, el) => {
            const href = $(el).attr("href") || "";
            const text = $(el).text().trim().toLowerCase();
            const cls = ($(el).attr("class") || "").toLowerCase();

            if (href.includes("/chapter-") && href.includes(seriesSlug)) {
                if (
                    text.includes("next") ||
                    cls.includes("next") ||
                    cls.includes("ch-next")
                ) {
                    const m = href.match(/\/(chapter-[^/]+)\/?$/);
                    if (m) nextChapter = m[1];
                }
                if (
                    text.includes("prev") ||
                    cls.includes("prev") ||
                    cls.includes("ch-prev")
                ) {
                    const m = href.match(/\/(chapter-[^/]+)\/?$/);
                    if (m) previousChapter = m[1];
                }
            }
        });

        // Cari dari select options (chapter navigator)
        if (!nextChapter || !previousChapter) {
            const options = [];
            $("select option").each((i, el) => {
                const val = $(el).attr("value");
                if (val && val.includes("/chapter-")) {
                    const m = val.match(/\/(chapter-[^/]+)\/?$/);
                    if (m) options.push(m[1]);
                }
            });
            if (options.length > 0) {
                const currentIdx = options.indexOf(chapterSlug);
                if (currentIdx > 0 && !previousChapter)
                    previousChapter = options[currentIdx - 1];
                if (currentIdx < options.length - 1 && !nextChapter)
                    nextChapter = options[currentIdx + 1];
            }
        }



        const data = {
            chapterId: chapterSlug,
            seriesId: seriesSlug,
            title: title,
            images: images,
            nextChapter: nextChapter,
            previousChapter: previousChapter,
        };

        setCache(cacheKey, data, cacheDuration);
        logger.info(`Kiryuu chapter ${chapterSlug}: ${images.length} images`);
        return data;
    } catch (error) {
        logger.error(`Kiryuu chapter error: ${error.message}`);
        throw error;
    }
}

/**
 * Pencarian komik
 * Strategi: Fetch halaman /manga/ lalu filter client-side berdasarkan query
 * Karena search API Kiryuu menggunakan HTMX+nonce yang sulit di-scrape
 */
async function fetchSearchResults(query) {
    const cacheKey = `kiryuu:search:${query}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        // Fetch beberapa halaman manga list, lalu filter client-side
        const allComics = [];
        for (let page = 1; page <= 3; page++) {
            try {
                const url = page <= 1 ? BASE_URL : `${BASE_URL}/manga/page/${page}/`;
                const html = await fetchHTML(url);
                const $ = cheerio.load(html);
                const comics = parseMangaItems($);
                allComics.push(...comics);
            } catch (e) {
                break;
            }
        }

        // Filter berdasarkan query (case-insensitive)
        const queryLower = query.toLowerCase();
        const results = allComics.filter((c) =>
            c.title.toLowerCase().includes(queryLower) ||
            c.comicId.toLowerCase().includes(queryLower)
        );

        setCache(cacheKey, results, cacheDuration);
        logger.info(`Kiryuu search "${query}": ${results.length} results from ${allComics.length} total`);
        return results;
    } catch (error) {
        logger.error(`Kiryuu search error: ${error.message}`);
        return [];
    }
}

/**
 * Daftar genre — diambil dari beberapa manga populer
 * Kiryuu tidak punya halaman genre statis, jadi kita kumpulkan dari detail pages
 */
async function fetchGenres(url) {
    const cacheKey = "kiryuu:genres";

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        // Ambil manga list untuk dapat beberapa slug populer
        const comics = await fetchComicsList(BASE_URL, { page: 1 });
        const genreMap = new Map();

        // Fetch detail dari beberapa manga untuk kumpulkan genre
        const slugsToFetch = comics.slice(0, 5).map((c) => c.comicId);
        for (const slug of slugsToFetch) {
            try {
                const detail = await fetchComicDetail(slug);
                if (detail.genres) {
                    detail.genres.forEach((g) => {
                        const gSlug = g.toLowerCase().replace(/\s+/g, "-");
                        if (!genreMap.has(gSlug)) {
                            genreMap.set(gSlug, {
                                name: g,
                                slug: gSlug,
                                link: `${BASE_URL}/genre/${gSlug}/`,
                            });
                        }
                    });
                }
            } catch (e) {
                // Skip jika error
            }
        }

        // Tambahkan genre umum yang pasti ada di Kiryuu
        const commonGenres = [
            "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
            "Harem", "Horror", "Isekai", "Josei", "Magic", "Martial Arts",
            "Mecha", "Mystery", "Project", "Psychological", "Romance",
            "School Life", "Sci-fi", "Seinen", "Shoujo", "Shounen",
            "Slice of Life", "Sports", "Supernatural", "Thriller", "Tragedy",
        ];
        commonGenres.forEach((g) => {
            const gSlug = g.toLowerCase().replace(/\s+/g, "-");
            if (!genreMap.has(gSlug)) {
                genreMap.set(gSlug, {
                    name: g,
                    slug: gSlug,
                    link: `${BASE_URL}/genre/${gSlug}/`,
                });
            }
        });

        const genres = [...genreMap.values()].sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        setCache(cacheKey, genres, 60 * 60 * 1000); // Cache 1 jam
        logger.info(`Kiryuu genres: ${genres.length} genres`);
        return genres;
    } catch (error) {
        logger.error(`Kiryuu fetch genres error: ${error.message}`);
        throw error;
    }
}

/**
 * Daftar komik berdasarkan genre
 * Kiryuu mendukung filter via /manga/?genre[]=action&page=N
 */
async function fetchComicsByGenre(genre, page = 1) {
    const cacheKey = `kiryuu:genre:${genre}:${page}`;

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const url =
            page <= 1
                ? `${BASE_URL}/manga/`
                : `${BASE_URL}/manga/page/${page}/`;

        const html = await fetchHTML(url, { "genre[]": genre });
        const $ = cheerio.load(html);
        const comics = parseMangaItems($);

        // Pagination
        let hasNextPage = false;
        $("a").each((i, el) => {
            const href = $(el).attr("href") || "";
            if (href.includes(`/page/${page + 1}`)) {
                hasNextPage = true;
            }
        });

        const result = {
            comics: comics,
            pagination: {
                currentPage: page,
                hasNextPage: hasNextPage,
            },
        };

        setCache(cacheKey, result, cacheDuration);
        logger.info(
            `Kiryuu genre "${genre}" page ${page}: ${comics.length} comics`
        );
        return result;
    } catch (error) {
        logger.error(`Kiryuu fetch by genre error: ${error.message}`);
        throw error;
    }
}

/**
 * Manga populer dari carousel homepage
 */
async function fetchPopularManga(url) {
    const cacheKey = "kiryuu:popular";

    if (getCache(cacheKey)) {
        return getCache(cacheKey);
    }

    try {
        const html = await fetchHTML(BASE_URL);
        const $ = cheerio.load(html);
        const popular = [];
        const seen = new Set();

        $(".swiper-slide").each((i, el) => {
            const a = $(el).find('a[href*="/manga/"]').first();
            if (!a.length) return;

            const href = a.attr("href");
            if (!href || !href.match(/\/manga\/[^/]+\/$/)) return;

            const slug = href.replace(/\/$/, "").split("/").pop();
            if (seen.has(slug)) return;
            seen.add(slug);

            const img = $(el).find("img").first();
            let image = "";
            if (img.length) {
                image = img.attr("data-src") || img.attr("src") || "";
            }

            const title =
                $(el).find("h1, h2, h3").first().text().trim() ||
                a.attr("title") ||
                "";

            if (!title) return;

            const genres = [];
            $(el)
                .find('a[href*="/genre/"]')
                .each((j, genreEl) => {
                    genres.push($(genreEl).text().trim());
                });

            popular.push({
                comicId: slug,
                title: title,
                image: image,
                link: href,
                genres: genres,
                rating: "0",
            });
        });

        setCache(cacheKey, popular, cacheDuration);
        logger.info(`Kiryuu popular: ${popular.length} comics`);
        return popular;
    } catch (error) {
        logger.error(`Kiryuu fetch popular error: ${error.message}`);
        throw error;
    }
}

module.exports = {
    fetchComicsList,
    fetchComicDetail,
    fetchChapterContent,
    fetchSearchResults,
    fetchGenres,
    fetchComicsByGenre,
    fetchPopularManga,
    fetchWithPuppeteer // Export for testing
};
