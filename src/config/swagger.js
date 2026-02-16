const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Komikaze API Documentation',
            version: '1.0.0',
            description: 'API Documentation for Komikaze Scraper API',
            contact: {
                name: 'Developer',
                url: 'https://github.com/necoffe',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://zuruideso.vercel.app',
                description: 'Production server',
            },
        ],
        components: {
            schemas: {
                Comic: {
                    type: 'object',
                    properties: {
                        comicId: { type: 'string', example: 'solo-leveling' },
                        title: { type: 'string', example: 'Solo Leveling' },
                        link: { type: 'string', example: 'https://...' },
                        image: { type: 'string', example: 'https://...' },
                        rating: { type: 'string', example: '9.8' },
                        type: { type: 'string', example: 'Manhwa' },
                        status: { type: 'string', example: 'Completed' },
                    },
                },
                DetailComic: {
                    type: 'object',
                    properties: {
                        comicId: { type: 'string' },
                        title: { type: 'string' },
                        subTitle: { type: 'string' },
                        coverImage: { type: 'string' },
                        synopsis: { type: 'string' },
                        chapters: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    chapterId: { type: 'string' },
                                    title: { type: 'string' },
                                    releaseTime: { type: 'string' }
                                }
                            }
                        },
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

module.exports = options;
