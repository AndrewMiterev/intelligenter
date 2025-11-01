import cron from 'node-cron';
import {DomainService} from './services/domainService';
import {initializeDatabase} from './models/database';
import {connectRedis} from './utils/redis';
import logger from './utils/logger';

class Scheduler {
    private domainService: DomainService;
    private isRunning: boolean = false; // one instance only, on many needed redesign

    constructor() {
        this.domainService = new DomainService();
    }

    start() {
        logger.info('Starting scheduler...');

        // Monthly execution on the 1st at 00:00
        cron.schedule('0 0 1 * *', async () => {
            if (this.isRunning) {
                logger.warn('Previous update still running, skipping...');
                return;
            }
            logger.info('Running monthly domain update...');
            await this.updateDomains();
        });
        // Health check every hour
        cron.schedule('0 * * * *', () => {
            logger.info('Scheduler health check - running');
        });
    }

    private async updateDomains() {
        this.isRunning = true;

        try {
            let offset = 0;
            const batchSize = parseInt(process.env.BATCH_SIZE || '50');
            const updateDelay = parseInt(process.env.UPDATE_DELAY_MS || '2000');
            let processedCount = 0;
            let errorCount = 0;

            do {
                const domains = await this.domainService.getDomainsForUpdate(batchSize, offset);

                if (domains.length === 0) {
                    logger.info('No more domains to process');
                    break;
                }

                logger.info(`Processing batch of ${domains.length} domains`, { offset });

                // Process domains in parallel with concurrency control
                const results = await Promise.allSettled(
                    domains.map(domain =>
                        this.processDomainWithRetry(domain.domain_name)
                    )
                );

                const batchProcessed = results.filter(r => r.status === 'fulfilled').length;
                const batchErrors = results.filter(r => r.status === 'rejected').length;

                processedCount += batchProcessed;
                errorCount += batchErrors;

                logger.info(`Batch completed: ${batchProcessed} success, ${batchErrors} errors`);

                offset += batchSize;

                // Delay between batches to avoid overwhelming external APIs
                if (domains.length === batchSize) {
                    await new Promise(resolve => setTimeout(resolve, updateDelay));
                }

            } while (true);

            logger.info('Monthly update completed', {
                processed: processedCount,
                errors: errorCount
            });
        } catch (error) {
            logger.error('Domain update scheduler error', {error});
        }
    }

    private async processDomainWithRetry(domainName: string, maxRetries: number = 3): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.domainService.createOrUpdateDomain(domainName);
                logger.info(`Scheduled update for domain: ${domainName}`);
                return;
            } catch (error) {
                logger.warn(`Attempt ${attempt} failed for domain ${domainName}`, { error });

                if (attempt === maxRetries) {
                    throw error;
                }

                // Exponential backoff
                const backoffDelay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }
}

// Scheduler startup
async function main() {
    try {
        await initializeDatabase();
        await connectRedis();
        const scheduler = new Scheduler();
        scheduler.start();
        logger.info('Scheduler is running...');

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });

    } catch (error) {
        logger.error('Failed to start scheduler', {error});
        process.exit(1);
    }
}

main().then();

