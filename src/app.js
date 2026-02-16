require('dotenv').config();
const express = require('express');
const { logger } = require('./config/logger');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');

// Inisialisasi aplikasi Express
const app = express();

// Middleware untuk parsing JSON
app.use(express.json());

// Logging untuk semua permintaan
app.use((req, res, next) => {
    logger.info(`Request: ${req.method} ${req.url}`, { ip: req.ip });
    next();
});

app.use(cors({
    origin: '*',
}));

// Swagger Documentation
const swaggerUiOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
    ],
    customSiteTitle: "Komikaze API Documentation",
};

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// Mount rute
app.use('/api/comics', require('./routes/comics'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/genres', require('./routes/genres'));
app.use('/api/popular-manga', require('./routes/popular-manga'));
app.use('/api/search', require('./routes/search'));
app.use('/api/search', require('./routes/search'));
// app.use('/', require('./routes/home')); // Replaced by Swagger UI

// Penanganan error
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
