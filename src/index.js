const app = require('./app');
const { logger } = require('./config/logger');
const port = process.env.PORT || 3000;

// Jalankan server
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});