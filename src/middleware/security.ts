import { Request, Response, NextFunction } from 'express';
import { pool } from '../models/database';
import logger from '../utils/logger';

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        logger.warn('Invalid API key', { ip: req.ip });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

export const logRequest = async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO requests (domain_name, request_type, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4)`,
            [
                req.query.domain || req.body.domain,
                req.method,
                req.ip,
                req.get('User-Agent')
            ]
        );
        logger.info('Request logged', { domain: req.query.domain || req.body.domain, method: req.method });
    } catch (error) {
        logger.error('Failed to log request', { error });
    } finally {
        client.release();
    }
    next();
};

