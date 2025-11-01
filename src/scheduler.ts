import cron from 'node-cron';
import {DomainService} from './services/domainService';
import {initializeDatabase} from './models/database';
import {connectRedis} from './utils/redis';
import logger from './utils/logger';

class Scheduler {
    private domainService: DomainService;

    constructor() {
        this.domainService = new DomainService();
    }

    start() {
        logger.info('Starting scheduler...');

        // Monthly execution on the 1st at 00:00
        cron.schedule('0 0 1 * *', async () => {
            logger.info('Running monthly domain update...');
            await this.updateDomains();
        });
    }

    private async updateDomains() {
        try {
            let offset = 0;
            const batchSize = 50;
            let domains: any[] = [];

            do {
                domains = await this.domainService.getDomainsForUpdate(batchSize, offset);
                logger.info(`Processing batch of ${domains.length} domains`, {offset});

                for (const domain of domains) {
                    try {
                        await this.domainService.createOrUpdateDomain(domain.domain_name);
                        logger.info(`Scheduled update for domain: ${domain.domain_name}`);
                        // Задержка для rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (error) {
                        logger.error(`Failed to update domain ${domain.domain_name}`, {error});
                    }
                }

                offset += batchSize;
            } while (domains.length === batchSize);
        } catch (error) {
            logger.error('Domain update scheduler error', {error});
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
    } catch (error) {
        logger.error('Failed to start scheduler', {error});
        process.exit(1);
    }
}

main();

