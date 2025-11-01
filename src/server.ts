import { createApp } from './app';
import { initializeDatabase } from './models/database';
import { connectRedis } from './utils/redis';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();
        await connectRedis();

        const app = createApp();

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`GET endpoint: http://localhost:${PORT}/get?domain=example.com`);
            logger.info(`POST endpoint: http://localhost:${PORT}/post`);
            logger.info(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

startServer();

