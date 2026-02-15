const axios = require('axios');
const fs = require('fs');

const BACKEND_URL = 'https://be.komikcast.fit';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://v1.komikcast.fit',
    'Referer': 'https://v1.komikcast.fit/',
};

async function main() {
    let out = '';

    // Cari endpoint auth
    const authEndpoints = [
        { method: 'POST', url: '/auth/login' },
        { method: 'POST', url: '/auth/signin' },
        { method: 'POST', url: '/login' },
        { method: 'POST', url: '/signin' },
        { method: 'POST', url: '/api/auth/login' },
        { method: 'POST', url: '/api/login' },
        { method: 'GET', url: '/auth' },
        { method: 'GET', url: '/auth/login' },
    ];

    for (const ep of authEndpoints) {
        try {
            let res;
            if (ep.method === 'POST') {
                res = await axios.post(`${BACKEND_URL}${ep.url}`,
                    { email: 'test@test.com', password: 'test123' },
                    { headers, timeout: 10000, validateStatus: () => true }
                );
            } else {
                res = await axios.get(`${BACKEND_URL}${ep.url}`,
                    { headers, timeout: 10000, validateStatus: () => true }
                );
            }
            out += `=== ${ep.method} ${ep.url} [${res.status}] ===\n`;
            out += `${JSON.stringify(res.data, null, 2).substring(0, 400)}\n\n`;
        } catch (e) {
            out += `=== ${ep.method} ${ep.url} [ERR] ===\n`;
            out += `${e.message}\n\n`;
        }
    }

    fs.writeFileSync('auth_probe.txt', out);
    console.log('Saved to auth_probe.txt');
}

main();
