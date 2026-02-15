const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugPuppeteer() {
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

        // Capture console logs
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure().errorText));

        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setViewport({ width: 375, height: 812 });

        const url = 'https://v1.komikcast.fit/chapter/one-piece-chapter-1122-bahasa-indonesia/';
        console.log(`Navigating to ${url}...`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Waiting for #root content...');
        try {
            await page.waitForFunction('document.querySelector("#root").childElementCount > 0', { timeout: 15000 });
            console.log('#root content loaded!');
        } catch (e) {
            console.log('#root content NOT loaded.');
        }

        const html = await page.content();
        fs.writeFileSync('debug_page_3.html', html);
        console.log('Saved debug_page_3.html');

        await page.screenshot({ path: 'debug_page_3.png' });
        console.log('Saved debug_page_3.png');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await browser.close();
    }
}

debugPuppeteer();
