const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugChapter() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Use a known existing chapter URL from previous logs
    const url = 'https://09.shinigami.asia/chapter/1ec14753-e8e6-47e7-b2c6-29af76a51f91';
    console.log(`Navigating to ${url}...`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait a bit for lazy loading
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        fs.writeFileSync('shinigami_chapter.html', html);
        console.log('Saved chapter HTML');

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

debugChapter();
