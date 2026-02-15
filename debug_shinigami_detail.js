const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugDetail() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Use a known existing series URL
    const url = 'https://09.shinigami.asia/series/3bcb1d69-5d2c-458c-96bb-d208323afd91';
    console.log(`Navigating to ${url}...`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait a bit for hydration
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        fs.writeFileSync('shinigami_detail.html', html);
        console.log('Saved detail HTML');

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

debugDetail();
