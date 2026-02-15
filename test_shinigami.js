const scraper = require('./src/scrapers/shinigami');

async function test() {
    try {
        console.log('--- Testing fetchComicsList ---');
        const comics = await scraper.fetchComicsList('https://09.shinigami.asia', { page: 1 });
        console.log(`[TEST] Found ${comics.length} comics`);
        if (comics.length === 0) {
            console.log('[TEST] Checking selectors consistency...');
        }
        if (comics.length > 0) {
            console.log('First comic:', comics[0]);

            const slug = comics[0].comicId;
            console.log(`\n--- Testing fetchComicDetail for ${slug} ---`);
            const detail = await scraper.fetchComicDetail(slug);
            console.log('Detail:', JSON.stringify(detail, null, 2));
            console.log('Chapters:', detail.chapters.length);

            if (detail.chapters.length > 0) {
                const chapterLink = detail.chapters[0].link;
                const chapterSlug = chapterLink.split('/').filter(Boolean).pop(); // Handle trailing slash

                console.log(`\n--- Testing fetchChapterContent for ${chapterSlug} ---`);
                const chapter = await scraper.fetchChapterContent(slug, chapterSlug);
                console.log('Chapter Images:', chapter.images.length);
                console.log('First Image:', chapter.images[0]);
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
