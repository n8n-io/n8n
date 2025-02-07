const { dbConfig } = require('./config/database');
const path = require('path');

// Set environment variables for n8n
process.env.N8N_PATH = path.dirname(__filename);
process.env.DB_TYPE = dbConfig.type;
process.env.DB_POSTGRESDB_HOST = dbConfig.host;
process.env.DB_POSTGRESDB_PORT = dbConfig.port.toString();
process.env.DB_POSTGRESDB_DATABASE = dbConfig.database;
process.env.DB_POSTGRESDB_USER = dbConfig.username;
process.env.DB_POSTGRESDB_PASSWORD = dbConfig.password;

// Debug log
console.log('DB Configuration:', {
  type: process.env.DB_TYPE,
  host: process.env.DB_POSTGRESDB_HOST,
  user: process.env.DB_POSTGRESDB_USER
});

// Start n8n using the local build (adjust the path as needed)
require(path.join(__dirname, '../dist/index'));