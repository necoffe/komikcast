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

        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setViewport({ width: 375, height: 812 });

        const url = 'https://v1.komikcast.fit/chapter/one-piece-chapter-1122-bahasa-indonesia/';
        console.log(`Navigating to ${url}...`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Waiting for #root content...');
        // Tunggu sampai #root terisi (tanda app loaded)
        try {
            await page.waitForFunction('document.querySelector("#root").childElementCount > 0', { timeout: 15000 });
            console.log('#root content loaded!');
        } catch (e) {
            console.log('#root content NOT loaded.');
        }

        const html = await page.content();
        fs.writeFileSync('debug_page_2.html', html);
        console.log('Saved debug_page_2.html');

        await page.screenshot({ path: 'debug_page_2.png' });
        console.log('Saved debug_page_2.png');

        const images = await page.evaluate(() => {
            // Coba selector yang lebih luas
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
