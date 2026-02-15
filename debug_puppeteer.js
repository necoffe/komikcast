const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugPuppeteer() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 812 });

        // const url = 'https://v1.komikcast.fit/chapter/one-piece-chapter-1174-bahasa-indonesia/';
        const url = 'https://v1.komikcast.fit/chapter/one-piece-chapter-1122-bahasa-indonesia/'; // try older chapter

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('Waiting for network idle...');
        await new Promise(r => setTimeout(r, 5000)); // Wait for 5s

        const html = await page.content();
        fs.writeFileSync('debug_page.html', html);
        console.log('Saved debug_page.html');

        await page.screenshot({ path: 'debug_page.png' });
        console.log('Saved debug_page.png');

        const images = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                class: img.className,
                parent: img.parentElement.className
            }));
        });

        console.log(`Found ${images.length} images total`);
        console.log('First 5 images:', JSON.stringify(images.slice(0, 5), null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
}

debugPuppeteer();
