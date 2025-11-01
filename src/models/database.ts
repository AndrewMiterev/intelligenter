import {Pool} from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'intelligenter',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

export const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        // Create domains table
        await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain_name VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_analyzed TIMESTAMP,
        vt_data JSONB,
        whois_data JSONB
      )
    `);

        // index on last_analyzed
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_domains_last_analyzed
                ON domains (last_analyzed) WHERE status = 'completed';
        `);hardcoded

        // Create requests table
        await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        domain_name VARCHAR(255) NOT NULL,
        request_type VARCHAR(10) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error('Database initialization failed', { error });
        throw error;
    } finally {
        client.release();
    }
};

