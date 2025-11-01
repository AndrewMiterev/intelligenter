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
    app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50,  // Reduced for stricter limits
        message: 'Too many requests, please try again later.'
    });
    app.use(limiter);

    // JSON and URL-encoded data parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/', domainRoutes);

    // Health check
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Обработка 404
    app.use('*', (req, res) => {
        res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
        logger.error('Unhandled error', { error });
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
};

