/**
 * @file db.js
 * @description Database connection configuration using pg (PostgreSQL) pool.
 */

const { Pool } = require('pg');

// Connection pool instance (lazily initialized)
let pool;

/**
 * Gets the database connection pool, initializing it if necessary.
 * @returns {import('pg').Pool}
 */
function getPool() {
    if (!pool) {
        pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        });
    }
    return pool;
}

module.exports = {
    /**
     * Executes a database query using the connection pool.
     * @param {string} text - The SQL query string.
     * @param {Array} params - The parameters for the query.
     * @returns {Promise<import('pg').QueryResult>} The result of the query.
     */
    query: (text, params) => getPool().query(text, params),
    
    /**
     * Sets a custom pool instance (used for testing).
     * @param {Object} customPool - The pool instance to use.
     */
    setPool: (customPool) => { pool = customPool; }
};

