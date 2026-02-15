const axios = require('axios');
const fs = require('fs');

const url = process.argv[2];
const outputFile = process.argv[3];

if (!url || !outputFile) {
    console.error('Usage: node fetch_html.js <url> <outputFile>');
    process.exit(1);
}

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function fetchHtml() {
    try {
        const response = await axios.get(url, { headers });
        let data = response.data;
        if (typeof data === 'object') {
            data = JSON.stringify(data, null, 2);
        }
        fs.writeFileSync(outputFile, data);
        console.log(`Successfully fetched ${url} to ${outputFile}`);
    } catch (error) {
        console.error(`Failed to fetch ${url}: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
        }
    }
}

fetchHtml();
