const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('../config/swagger');
const fs = require('fs');
const path = require('path');

const spec = swaggerJsdoc(swaggerOptions);
const outputPath = path.join(__dirname, '../config/swagger.json');

fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
console.log(`Swagger spec generated at ${outputPath}`);
