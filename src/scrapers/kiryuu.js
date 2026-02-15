const cheerio = require("cheerio");
const axios = require("axios");
const { getCache, setCache } = require("../config/cache");
const { logger } = require("../config/logger");

const BASE_URL = "https://kiryuu03.com";
const cacheDuration = 15 * 60 * 1000; // 15 menit

const defaultHeaders = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Referer: BASE_URL + "/",
};

/**
 * Fetch HTML dari URL dengan axios
 */
async function fetchHTML(url, params = {}) {
    logger.info(`Fetching: ${url}`);
    const response = await axios.get(url, {
        headers: defaultHeaders,
        params,
        timeout: 30000,
    });
    return response.data;
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

        const html = await fetchHTML(url);
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
};
