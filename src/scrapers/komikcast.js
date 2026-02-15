const axios = require("axios");
const { getCache, setCache } = require("../config/cache");
const { logger } = require("../config/logger");

const cacheDuration = 60 * 60 * 1000; // 1 jam dalam milidetik
const BACKEND_URL = "https://be.komikcast.fit";

// Headers yang diperlukan agar backend tidak menolak request
const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Origin: "https://v1.komikcast.fit",
  Referer: "https://v1.komikcast.fit/",
};

// Auto-login: simpan token di memory
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Login otomatis ke Komikcast backend menggunakan email/password dari .env
 * Token di-cache di memory dan di-refresh otomatis kalau expired
 */
async function getAuthToken() {
  // Return cached token jika masih valid (expired setelah 23 jam)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.KOMIKCAST_EMAIL;
  const password = process.env.KOMIKCAST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "KOMIKCAST_EMAIL dan KOMIKCAST_PASSWORD belum diisi di .env. Silakan isi dengan akun Komikcast Anda."
    );
  }

  try {
    logger.info("Auto-login ke Komikcast backend...");
    const response = await axios.post(
      `${BACKEND_URL}/auth/login`,
      { email, password, rememberMe: true },
      {
        timeout: 15000,
        headers: {
          ...defaultHeaders,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    // Cari token dari response (bisa di berbagai field)
    const token =
      data.token ||
      data.value ||
      data.accessToken ||
      data.access_token ||
      data.data?.token ||
      data.data?.value ||
      data.data?.accessToken;

    if (!token) {
      logger.error("Login response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Login berhasil tapi token tidak ditemukan di response");
    }

    cachedToken = token;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // Cache 23 jam
    logger.info("Auto-login berhasil, token didapat");

    return token;
  } catch (error) {
    if (error.response?.data?.error) {
      throw new Error(`Login gagal: ${error.response.data.error}`);
    }
    throw error;
  }
}

/**
 * Helper: format item dari API /series menjadi format response standar
 */
function formatSeriesItem(item) {
  const d = item.data || {};
  const meta = item.dataMetadata || {};
  return {
    comicId: d.slug || "no-id",
    title: d.title || "No Title",
    link: `https://v1.komikcast.fit/series/${d.slug}/`,
    image: d.coverImage || "No Image",
    type: (d.format || "No Type").toLowerCase(),
    chapter: d.totalChapters ? `Chapter ${d.totalChapters}` : "No Chapter",
    rating: String(d.rating || "0"),
    status: (d.status || "ongoing").toLowerCase(),
  };
}

async function fetchComicsList(baseUrl, params = {}) {
  const {
    page = 1,
    genres = [],
    status = "",
    type = "",
    orderby = "update",
  } = params;
  const cacheKey = `komikcast:comics-list:page-${page}-genres-${genres.join(
    ","
  )}-status-${status}-type-${type}-orderby-${orderby}`;

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info(`Mengembalikan daftar komik (${cacheKey}) dari cache`);
    return getCache(cacheKey);
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.set("page", page);
    if (status) queryParams.set("status", status);
    if (type) queryParams.set("type", type);
    if (orderby) queryParams.set("sort", orderby);

    const url = `${BACKEND_URL}/series?${queryParams.toString()}`;
    logger.info(`Mengambil daftar komik: ${url}`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const apiData = response.data;
    const comicsList = (apiData.data || []).map(formatSeriesItem);

    setCache(cacheKey, comicsList, cacheDuration);
    logger.info(
      `Daftar komik (${cacheKey}, ${comicsList.length} item) berhasil diambil dan disimpan di cache`
    );

    return comicsList;
  } catch (error) {
    logger.error(`Gagal mengambil daftar komik: ${error.message}`);
    throw error;
  }
}

async function fetchComicDetail(slug) {
  const cacheKey = `komikcast:comic-detail:${slug}`;

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info(`Mengembalikan detail komik untuk ${slug} dari cache`);
    return getCache(cacheKey);
  }

  try {
    logger.info(`Mengambil detail komik: ${slug}`);

    // Ambil detail series
    const [seriesRes, chaptersRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/series/${slug}`, {
        timeout: 15000,
        headers: defaultHeaders,
      }),
      axios.get(`${BACKEND_URL}/series/${slug}/chapters`, {
        timeout: 15000,
        headers: defaultHeaders,
      }),
    ]);

    const seriesData = seriesRes.data;
    if (!seriesData.data) {
      throw new Error("Comic not found");
    }

    const d = seriesData.data.data || {};
    const detail = {};

    detail.comicId = slug;
    detail.coverImage = d.coverImage || "No Image";
    detail.title = d.title || "No Title";
    detail.nativeTitle = d.nativeTitle || "No Native Title";
    detail.genres = (d.genres || []).map((g) => g.data?.name || "Unknown");
    detail.releaseYear = d.releaseDate || "No Year";
    detail.author = d.author || "No Author";
    detail.status = (d.status || "ongoing").toLowerCase();
    detail.type = (d.format || "No Type").toLowerCase();
    detail.totalChapters = d.totalChapters || "0";
    detail.updatedOn =
      seriesData.data.updatedAt
        ? new Date(seriesData.data.updatedAt).toLocaleDateString("id-ID")
        : "No Date";
    detail.rating = String(d.rating || "0");
    detail.synopsis = d.synopsis || "No Synopsis";

    // Ambil daftar chapter
    const chaptersData = chaptersRes.data;
    detail.chapters = (chaptersData.data || []).map((ch) => {
      const chData = ch.data || {};
      const chIndex = chData.index || 0;
      const chTitle = chData.title || `Chapter ${chIndex}`;
      return {
        chapterId: String(ch.id),
        title: chTitle || `Chapter ${chIndex}`,
        link: `https://v1.komikcast.fit/chapter/${slug}-chapter-${chIndex}/`,
        releaseTime: ch.createdAt
          ? new Date(ch.createdAt).toLocaleDateString("id-ID")
          : "No Time",
        index: chIndex,
      };
    });

    setCache(cacheKey, detail, cacheDuration);
    logger.info(
      `Detail komik untuk ${slug} berhasil diambil dan disimpan di cache`
    );

    return detail;
  } catch (error) {
    logger.error(
      `Gagal mengambil detail komik untuk ${slug}: ${error.message}`
    );
    throw error;
  }
}

async function fetchGenres(url) {
  const cacheKey = "komikcast:genres";

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info("Mengembalikan genres dari cache");
    return getCache(cacheKey);
  }

  try {
    logger.info(`Mengambil genres dari backend API`);
    const response = await axios.get(`${BACKEND_URL}/genres`, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const apiData = response.data;
    const genresList = (apiData.data || []).map((g) => {
      const gData = g.data || {};
      return {
        name: gData.name || "No Name",
        seriesCount: 0, // API tidak mengembalikan count
        link: `https://v1.komikcast.fit/genres/${(gData.name || "").toLowerCase().replace(/\s+/g, "-")}/`,
        id: g.id,
      };
    });

    setCache(cacheKey, genresList, cacheDuration);
    logger.info("Genres berhasil diambil dan disimpan di cache");

    return genresList;
  } catch (error) {
    logger.error(`Gagal mengambil genres: ${error.message}`);
    throw error;
  }
}

async function fetchPopularManga(url) {
  const cacheKey = "komikcast:popular-manga";

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info("Mengembalikan manga populer dari cache");
    return getCache(cacheKey);
  }

  try {
    logger.info(`Mengambil manga populer dari backend API`);
    const response = await axios.get(`${BACKEND_URL}/popular`, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const apiData = response.data;
    const popularMangaList = (apiData.data || []).map((item, index) => {
      // /popular endpoint bisa return format yang sedikit beda
      const attrs = item.$attributes || item;
      const d = attrs.data || {};
      return {
        comicId: d.slug || "no-id",
        rank: String(index + 1),
        title: d.title || "No Title",
        link: `https://v1.komikcast.fit/series/${d.slug}/`,
        image: d.coverImage || "No Image",
        genres: (d.genreIds || []).map(String),
        year: d.releaseDate || "No Year",
      };
    });

    setCache(cacheKey, popularMangaList, cacheDuration);
    logger.info("Manga populer berhasil diambil dan disimpan di cache");

    return popularMangaList;
  } catch (error) {
    logger.error(`Gagal mengambil manga populer: ${error.message}`);
    throw error;
  }
}

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function fetchChapterContent(seriesSlug, chapterSlug) {
  const cacheKey = `komikcast:chapter:${seriesSlug}:${chapterSlug}`;

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info(
      `Mengembalikan konten chapter untuk ${seriesSlug}/${chapterSlug} dari cache`
    );
    return getCache(cacheKey);
  }

  let browser = null;
  try {
    logger.info(`Mengambil konten chapter (Puppeteer): ${seriesSlug}/${chapterSlug}`);

    let launchOptions = {
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Menghemat resource
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ],
      ignoreHTTPSErrors: true
    };

    // Konfigurasi khusus Vercel/Lambda
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      const chromium = require('@sparticuz/chromium');
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true
      };
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Set User-Agent agar tidak terdeteksi sebagai bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport mobile agar hemat bandwidth & layout konsisten
    await page.setViewport({ width: 375, height: 812 });

    // Block resource berat (font, image, css) untuk mempercepat loading
    // Kita hanya butuh URL image, tidak perlu render gambarnya
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //   const resourceType = req.resourceType();
    //   if (['font', 'stylesheet'].includes(resourceType)) {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    const url = `https://v1.komikcast.fit/series/${seriesSlug}/chapter/${chapterSlug}/`;
    logger.info(`Navigasi ke: ${url}`);

    // Timeout 60s karena loading full page bisa lama
    // Gunakan networkidle2 untuk memastikan script selesai load
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Tunggu container gambar muncul
    try {
      await page.waitForSelector('.main-reading-area img', { timeout: 30000 });
    } catch (e) {
      // Jika error detached frame, coba reload sekali lagi
      if (e.message.includes('detached Frame')) {
        logger.warn('Detached frame detected, reloading page...');
        await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('.main-reading-area img', { timeout: 30000 });
      } else {
        logger.warn('Selector .main-reading-area img tidak ditemukan dalam 30s');
        // Cek loading gif
        const loader = await page.$('.loading-gif');
        if (loader) {
          throw new Error("Halaman masih loading (mungkin terblokir Cloudflare/Bot Protection).");
        }
      }
    }

    // Extract data dari halaman
    const chapterData = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('.main-reading-area img')).map(img => img.src);

      const titleEl = document.querySelector('h1.entry-title');
      const title = titleEl ? titleEl.innerText.trim() : '';

      const prevEl = document.querySelector('.nextprev a[rel="prev"]');
      const nextEl = document.querySelector('.nextprev a[rel="next"]');

      // Ambil slug dari URL href
      const getSlug = (url) => {
        if (!url) return null;
        const matches = url.match(/\/chapter\/([^/]+)/);
        return matches ? matches[1] : null;
      };

      return {
        title,
        images,
        previousChapter: getSlug(prevEl?.href),
        nextChapter: getSlug(nextEl?.href)
      };
    });

    if (chapterData.images.length === 0) {
      throw new Error("Tidak ada gambar ditemukan. Kemungkinan proteksi Cloudflare atau layout berubah.");
    }

    const chapter = {
      chapterId: chapterSlug,
      title: chapterData.title || chapterSlug,
      images: chapterData.images,
      previousChapter: chapterData.previousChapter,
      nextChapter: chapterData.nextChapter,
      seriesId: seriesSlug
    };

    setCache(cacheKey, chapter, cacheDuration);
    logger.info(
      `Konten chapter untuk ${seriesSlug}/${chapterSlug} berhasil diambil (${chapter.images.length} gambar)`
    );

    return chapter;
  } catch (error) {
    logger.error(
      `Gagal mengambil konten chapter (Puppeteer) untuk ${seriesSlug}/${chapterSlug}: ${error.message}`
    );
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchComicsByGenre(genre, page = 1) {
  const cacheKey = `komikcast:comics-by-genre:${genre}:page-${page}`;

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info(
      `Mengembalikan daftar komik untuk genre ${genre} (page ${page}) dari cache`
    );
    return getCache(cacheKey);
  }

  try {
    logger.info(
      `Mengambil daftar komik untuk genre ${genre} (page ${page}) dari backend API`
    );

    // Pertama, ambil genres untuk mapping nama ke ID
    const genresRes = await axios.get(`${BACKEND_URL}/genres`, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const genresData = genresRes.data.data || [];
    const matchedGenre = genresData.find(
      (g) =>
        (g.data?.name || "").toLowerCase() ===
        genre.toLowerCase().replace(/-/g, " ")
    );

    if (!matchedGenre) {
      return { comics: [], pagination: { currentPage: page, prevPage: null, nextPage: null } };
    }

    // Gunakan /series endpoint dengan filter (kalau tersedia)
    // Berdasarkan test, genreId filter belum bekerja optimal, jadi kita ambil semua dan filter client-side
    const url = `${BACKEND_URL}/series?page=${page}`;
    const response = await axios.get(url, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const apiData = response.data;
    const allComics = apiData.data || [];
    const genreId = matchedGenre.id;

    // Filter berdasarkan genreId
    const filteredComics = allComics.filter((item) => {
      const d = item.data || {};
      return (d.genreIds || []).includes(genreId);
    });

    const comicsList = filteredComics.map(formatSeriesItem);

    const meta = apiData.meta || {};
    const pagination = {
      currentPage: meta.page || page,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: meta.lastPage && page < meta.lastPage ? page + 1 : null,
    };

    const result = { comics: comicsList, pagination };

    setCache(cacheKey, result, cacheDuration);
    logger.info(
      `Daftar komik untuk genre ${genre} (page ${page}, ${comicsList.length} item) berhasil diambil dan disimpan di cache`
    );

    return result;
  } catch (error) {
    logger.error(
      `Gagal mengambil daftar komik untuk genre ${genre} (page ${page}): ${error.message}`
    );
    throw error;
  }
}

async function fetchSearchResults(query) {
  const cacheKey = `komikcast:search:${query}`;

  // Cek cache
  if (getCache(cacheKey)) {
    logger.info(
      `Mengembalikan hasil pencarian untuk query "${query}" dari cache`
    );
    return getCache(cacheKey);
  }

  try {
    // Gunakan /series?title= untuk pencarian
    const url = `${BACKEND_URL}/series?title=${encodeURIComponent(query)}`;
    logger.info(`Mengambil hasil pencarian untuk query "${query}": ${url}`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: defaultHeaders,
    });

    const apiData = response.data;
    const searchResults = (apiData.data || []).map(formatSeriesItem);

    setCache(cacheKey, searchResults, cacheDuration);
    logger.info(
      `Hasil pencarian untuk query "${query}" (${searchResults.length} item) berhasil diambil dan disimpan di cache`
    );

    return searchResults;
  } catch (error) {
    logger.error(
      `Gagal mengambil hasil pencarian untuk query "${query}": ${error.message}`
    );
    throw error;
  }
}

module.exports = {
  fetchComicsList,
  fetchComicDetail,
  fetchGenres,
  fetchPopularManga,
  fetchChapterContent,
  fetchComicsByGenre,
  fetchSearchResults,
};
