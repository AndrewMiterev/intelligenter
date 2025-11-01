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
                domain_name VARCHAR(253) UNIQUE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_analyzed TIMESTAMP,
                vt_data JSONB,
                whois_data JSONB,
                analysis_count INTEGER DEFAULT 0,
                last_error TEXT
                )
        `);

        // Improved indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_domains_last_analyzed
                ON domains (last_analyzed) WHERE status = 'completed';
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_domains_status
                ON domains (status)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_domains_updated 
            ON domains (updated_at)
        `);


        // Create requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                domain_name VARCHAR(253) NOT NULL,
                request_type VARCHAR(10) NOT NULL,
                ip_address INET,
                user_agent TEXT,
                response_status INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `);

        // Index for requests
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_requests_domain 
            ON requests (domain_name)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_requests_created 
            ON requests (created_at)
        `);

        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error('Database initialization failed', { error });
        throw error;
    } finally {
        client.release();
    }
};

