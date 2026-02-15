const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testSimple() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setViewport({ width: 375, height: 812 });

        const url = 'https://v1.komikcast.fit/series/one-piece/chapter/1174/';
        console.log(`Navigating to ${url}...`);

        // Wait until domcontentloaded + manual wait
        const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        try {
            await navigationPromise;
            console.log('Navigation PROMISE resolved!');
        } catch (e) {
            console.log('No extra navigation happened within 5s');
        }

        console.log('Waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));

        // Check if detached
        try {
            const title = await page.title();
            console.log('Page Title:', title);
        } catch (e) {
            console.log('Frame detached? error:', e.message);
        }

        // Extract images
        const images = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('.main-reading-area img'));
            return imgs.map(img => img.src);
        });

        console.log(`Found ${images.length} images`);
        if (images.length > 0) {
            console.log('First image:', images[0]);
        } else {
            // Check loading gif
            const loader = await page.$('.loading-gif');
            if (loader) console.log('Loader is still present');
            else console.log('Loader not found');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
}

testSimple();
