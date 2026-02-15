require('dotenv').config();
const axios = require('axios');

async function testLoginAndFetch() {
    const email = process.env.KOMIKCAST_EMAIL;
    const password = process.env.KOMIKCAST_PASSWORD;

    if (!email || !password) {
        console.error('Credentials missing');
        return;
    }

    console.log(`Testing login for: ${email}`);

    try {
        const res = await axios.post('https://be.komikcast.fit/auth/login',
            { email, password, rememberMe: true },
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Content-Type': 'application/json',
                    'Origin': 'https://v1.komikcast.fit',
                    'Referer': 'https://v1.komikcast.fit/',
                }
            }
        );
        console.log('Login Status:', res.status);

        // Extract token
        const token = res.data.data?.value;
        if (!token) {
            console.log('Token not found in response');
            console.log(JSON.stringify(res.data, null, 2));
            return;
        }

        console.log('Token obtained:', token.substring(0, 20) + '...');

        // Try fetch chapter
        const chapterId = 383381;
        console.log(`\nTesting fetch chapter ${chapterId}...`);

        const chapterRes = await axios.get(`https://be.komikcast.fit/chapters/${chapterId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Authorization': `Bearer ${token}`,
                'Origin': 'https://v1.komikcast.fit',
                'Referer': 'https://v1.komikcast.fit/',
            }
        });

        console.log('Chapter fetch status:', chapterRes.status);
        // console.log('Chapter data preview:', JSON.stringify(chapterRes.data, null, 2).substring(0, 500));

    } catch (err) {
        console.log('Error:', err.message);
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testLoginAndFetch();
