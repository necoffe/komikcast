const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugApi() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('explore.shngm.io') || url.includes('/api/')) {
            console.log(`Response from: ${url}`);
            try {
                const buffer = await response.buffer();
                if (buffer.length > 0) {
                    const data = buffer.toString();
                    if (data.startsWith('{') || data.startsWith('[')) {
                        fs.writeFileSync('shinigami_api_response.json', data);
                        console.log('Saved API response to shinigami_api_response.json');
                    }
                }
            } catch (e) {
                // Ignore errors for non-text responses or redirects
            }
        }
    });

    console.log('Navigating...');
    await page.goto('https://09.shinigami.asia/explore', { waitUntil: 'networkidle2', timeout: 60000 });
    await browser.close();
}

debugApi();
