import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                logger.error('Too many Redis reconnection attempts');
                return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
        }
    },
    password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
    logger.debug('Redis connecting...');
});

redisClient.on('ready', () => {
    logger.info('Redis connected successfully');
});

redisClient.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
});

export const connectRedis = async (): Promise<void> => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        logger.error('Failed to connect to Redis', { error });
        throw error;
    }
};

export const disconnectRedis = async (): Promise<void> => {
    try {
        if (redisClient.isOpen) {
            await redisClient.disconnect();
            logger.info('Redis disconnected');
        }
    } catch (error) {
        logger.error('Failed to disconnect from Redis', { error });
        throw error;
    }
};

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
    try {
        if (!redisClient.isOpen) {
            return false;
        }
        await redisClient.ping();
        return true;
    } catch (error) {
        return false;
    }
};

export default redisClient;