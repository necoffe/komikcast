const puppeteer = require('puppeteer');

async function testPuppeteer() {
    console.log('Launching browser...');
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched');

        const page = await browser.newPage();
        // Use a known public chapter URL
        const url = 'https://v1.komikcast.fit/chapter/one-piece-chapter-1174-bahasa-indonesia/';

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const title = await page.title();
        console.log(`Page title: ${title}`);

        // Check for images
        const images = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('.main-reading-area img'));
            return imgs.map(img => img.src);
        });

        console.log(`Found ${images.length} images`);
        if (images.length > 0) {
            console.log('First image:', images[0]);
        }

        await browser.close();
        console.log('Browser closed');
    } catch (err) {
        console.error('Puppeteer error:', err.message);
    }
}

testPuppeteer();
