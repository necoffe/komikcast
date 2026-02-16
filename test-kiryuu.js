const { fetchChapterContent, fetchPopularManga, fetchComicDetail } = require('./src/scrapers/kiryuu');
const { logger } = require('./src/config/logger');

// Mock logger
logger.info = console.log;
logger.warn = console.warn;
logger.error = console.error;

(async () => {
    try {
        console.log('Fetching popular manga...');
        const popular = await fetchPopularManga();

        if (popular.length === 0) {
            console.error('No popular manga found. Site might be changed or blocked.');
            return;
        }

        const comic = popular[0];
        console.log(`Found popular comic: ${comic.title} (${comic.comicId})`);

        console.log(`Fetching details for ${comic.comicId}...`);
        const detail = await fetchComicDetail(comic.comicId);

        if (!detail.chapters || detail.chapters.length === 0) {
            console.error('No chapters found.');
            return;
        }

        // Get the latest chapter
        const chapter = detail.chapters[0];
        console.log(`Testing chapter: ${chapter.title} (${chapter.chapterId})`);

        console.time('fetchChapterContent');
        const data = await fetchChapterContent(comic.comicId, chapter.chapterId);
        console.timeEnd('fetchChapterContent');

        if (data && data.images && data.images.length > 0) {
            console.log(`Success! Found ${data.images.length} images.`);
        } else {
            console.log('Failed: No images found.');
        }

    } catch (e) {
        console.error('Error during test:', e);
    }
})();
