import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { err });
});

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        logger.info('Redis connected successfully');
    }
};

export const disconnectRedis = async () => {
    if (redisClient.isOpen) {
        await redisClient.disconnect();
        logger.info('Redis disconnected');
    }
};

export default redisClient;

