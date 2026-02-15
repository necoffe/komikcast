const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');

async function debugShinigami() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Capture requests
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const type = req.resourceType();
        if (['xhr', 'fetch'].includes(type) && !req.url().includes('google') && !req.url().includes('cloudflare')) {
            console.log(`[${type.toUpperCase()}] ${req.url()}`);
        }
        req.continue();
    });

    console.log('Navigating to https://09.shinigami.asia/explore...');
    try {
        await page.goto('https://09.shinigami.asia/explore', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded');

        // Save HTML
        const html = await page.content();
        fs.writeFileSync('shinigami_rendered.html', html);
        console.log('Saved rendered HTML to shinigami_rendered.html');

    } catch (e) {
        console.error('Error:', e.message);
        const html = await page.content();
        fs.writeFileSync('shinigami_rendered_error.html', html);
    } finally {
        await browser.close();
    }
}

debugShinigami();
