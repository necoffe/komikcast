const axios = require('axios');

const BACKEND_URL = 'https://be.komikcast.fit';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json',
    'Origin': 'https://v1.komikcast.fit',
    'Referer': 'https://v1.komikcast.fit/',
};

async function probe() {
    const seriesSlug = 'one-piece';
    const chapterSlug = 'one-piece-chapter-1174'; // known slug
    const chapterId = 383381; // known ID

    const patterns = [
        `/chapter/${chapterSlug}`,
        `/chapters/${chapterSlug}`,
        `/series/${seriesSlug}/chapter/${chapterSlug}`,
        `/series/${seriesSlug}/chapters/${chapterSlug}`,
        `/series/${seriesSlug}/chapter/${chapterId}`,
        `/series/${seriesSlug}/chapters/${chapterId}`,
        `/public/chapter/${chapterSlug}`,
        `/public/chapters/${chapterId}`,
        `/api/chapter/${chapterSlug}`,
        `/api/chapters/${chapterId}`,
        `/read/${chapterSlug}`,
        `/komik/${seriesSlug}/chapter/${chapterSlug}`,
    ];

    for (const p of patterns) {
        try {
            console.log(`Testing ${p}...`);
            const res = await axios.get(`${BACKEND_URL}${p}`, { headers, validateStatus: () => true });
            console.log(`  Status: ${res.status}`);
            if (res.status === 200) {
                console.log(`  Data: ${JSON.stringify(res.data).substring(0, 200)}`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }
}

probe();
