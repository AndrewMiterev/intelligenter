import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';  // ? I don't know - miss in requirements
import domainRoutes from './routes/domainRoutes';
import logger from './utils/logger';

export const createApp = () => {
    const app = express();

    // CORS
    app.use(cors({ origin: '*' }));  // ??? Configure as needed
    // app.use(cors({
    //        origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://your-production-domain.com',
    //        methods: ['GET', 'POST'],
    //        allowedHeaders: ['X-API-KEY', 'Content-Type']
    // }));

    // Middleware security
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "same-site" }
    }));

    // Rate limiting with different strategies
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    });

    const strictLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'Too many analysis requests, please try again later.'
    });

    app.use(generalLimiter);
    app.use('/post', strictLimiter);

    // JSON and URL-encoded data parsing
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Routes
    app.use('/', domainRoutes);

    // Health check with system info
    app.get('/health', async (req, res) => {
        try {
            const health = {
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV
            };
            res.status(200).json(health);
        } catch (error) {
            res.status(503).json({ status: 'ERROR', error: 'Health check failed' });
        }
    });

    // Обработка 404
    app.use('*', (req, res) => {
        res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handling middleware,  Global error handler
    app.use((error: any, req: any, res: any, next: any) => {
        logger.error('Unhandled error', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });

        // Don't leak error details in production
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message;

        res.status(500).json({ error: message });
    });

    return app;
};

