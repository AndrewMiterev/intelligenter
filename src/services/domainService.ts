import { pool } from '../models/database';
import { Domain, AnalysisResult } from '../models/domain';
import { VirusTotalService } from './virusTotalService';
import { WhoisService } from './whoisService';
import logger from '../utils/logger';
import redisClient from '../utils/redis';

export class DomainService {
    private virusTotalService: VirusTotalService;
    private whoisService: WhoisService;
    private cacheTTL: number = 3600; // 1 час в секундах

    constructor() {
        this.virusTotalService = new VirusTotalService();
        this.whoisService = new WhoisService();
    }

    async getDomain(domainName: string): Promise<AnalysisResult | null> {
        const cacheKey = `domain:${domainName}`;

        try {
            // check cache
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                logger.info('Cache hit', { domain: domainName });
                return JSON.parse(cachedData);
            }
            logger.info('Cache miss', { domain: domainName });
        } catch (error) {
            logger.error('Redis get failed, falling back to DB', { error });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM domains WHERE domain_name = $1',
                [domainName]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const domain = result.rows[0];
            const response = this.formatDomainResponse(domain);

            // Cache only completed domains
            if (domain.status === 'completed') {
                try {
                    await redisClient.set(cacheKey, JSON.stringify(response), { EX: this.cacheTTL });
                    logger.info('Cached domain data', { domain: domainName });
                } catch (error) {
                    logger.error('Redis set failed', { error });
                }
            }

            return response;
        } catch (error) {
            logger.error('getDomain failed', { error });
            throw error;
        } finally {
            client.release();
        }
    }

    async createOrUpdateDomain(domainName: string): Promise<AnalysisResult> {
        const cacheKey = `domain:${domainName}`;

        // Invalidate cache before analysis
        try {
            await redisClient.del(cacheKey);
            logger.info('Cache invalidated for analysis', { domain: domainName });
        } catch (error) {
            logger.error('Redis del failed', { error });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existingResult = await client.query(
                'SELECT * FROM domains WHERE domain_name = $1 FOR UPDATE',
                [domainName]
            );

            let domain: Domain;

            if (existingResult.rows.length > 0) {
                domain = existingResult.rows[0];

                if (domain.status === 'analyzing') {
                    await client.query('ROLLBACK');
                    return { domain: domainName, status: 'onAnalysis' };
                }

                await client.query(
                    `UPDATE domains 
           SET status = 'analyzing', updated_at = CURRENT_TIMESTAMP 
           WHERE domain_name = $1`,
                    [domainName]
                );
            } else {
                await client.query(
                    `INSERT INTO domains (domain_name, status) 
           VALUES ($1, 'analyzing')`,
                    [domainName]
                );
            }

            await client.query('COMMIT');

            // run analysis in background
            this.performAnalysis(domainName).catch(error => {
                logger.error('Background analysis failed', { error, domain: domainName });
            });

            return { domain: domainName, status: 'onAnalysis' };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('createOrUpdateDomain failed', { error });
            throw error;
        } finally {
            client.release();
        }
    }

    private async performAnalysis(domainName: string) {
        const cacheKey = `domain:${domainName}`;

        try {
            const [vtData, whoisData] = await Promise.all([
                this.virusTotalService.analyzeDomain(domainName),
                this.whoisService.analyzeDomain(domainName)
            ]);

            const client = await pool.connect();
            try {
                await client.query(
                    `UPDATE domains 
           SET status = 'completed', 
               vt_data = $1, 
               whois_data = $2,
               last_analyzed = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE domain_name = $3`,
                    [vtData, whoisData, domainName]
                );
                logger.info('Analysis completed', { domain: domainName });

                // to cache after success
                const response: AnalysisResult = {
                    domain: domainName,
                    VTData: vtData,
                    WhoisData: whoisData
                };
                await redisClient.set(cacheKey, JSON.stringify(response), { EX: this.cacheTTL });
                logger.info('Cached after analysis', { domain: domainName });
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error(`Analysis failed for domain ${domainName}`, { error });

            const client = await pool.connect();
            try {
                await client.query(
                    `UPDATE domains 
           SET status = 'error', updated_at = CURRENT_TIMESTAMP 
           WHERE domain_name = $1`,
                    [domainName]
                );
                // remove on error from cache
                await redisClient.del(cacheKey);
            } finally {
                client.release();
            }
        }
    }

    async getDomainsForUpdate(batchSize: number = 50, offset: number = 0): Promise<Domain[]> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM domains 
         WHERE status = 'completed' 
         AND (last_analyzed IS NULL OR last_analyzed < NOW() - INTERVAL '1 month')
         ORDER BY last_analyzed ASC
         LIMIT $1 OFFSET $2`,
                [batchSize, offset]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    private formatDomainResponse(domain: Domain): AnalysisResult {
        const response: AnalysisResult = {
            domain: domain.domain_name
        };

        if (domain.status === 'completed' && domain.vt_data && domain.whois_data) {
            response.VTData = domain.vt_data;
            response.WhoisData = domain.whois_data;
        } else if (domain.status === 'error') {
            response.status = 'error';
            response.message = 'Analysis failed. Please try again later.';
        } else {
            response.status = domain.status;
        }

        return response;
    }
}

