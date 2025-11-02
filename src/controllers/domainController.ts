import { Request, Response } from 'express';
import { DomainService } from '../services/domainService';
import logger from '../utils/logger';

const domainService = new DomainService();

export class DomainController {
    async getDomain(req: Request, res: Response) {
        const startTime = Date.now();

        try {
            const domain = req.query.domain as string;
            logger.debug(`Get Domain Controller ${domain}`);

            if (!domain) {
                return res.status(400).json({ error: 'Domain parameter is required' });
            }

            const domainData = await domainService.getDomain(domain);

            if (!domainData) {
                logger.info('Domain not found, starting analysis', { domain });
                const analysisResult = await domainService.createOrUpdateDomain(domain);
                return res.json(analysisResult);
            }

            // Check if analysis is stale (older than 1 day)
            const isStale = await domainService.isAnalysisStale(domain);
            if (isStale) {
                logger.info('Domain data is stale, triggering re-analysis', { domain });
                domainService.createOrUpdateDomain(domain).catch(error => {
                    logger.error('Background re-analysis failed', { domain, error });
                });
            }

            res.json(domainData);

        } catch (error) {
            logger.error('GET domain error', {
                error,
                domain: req.query.domain,
                duration: Date.now() - startTime
            });

            res.status(500).json({
                error: 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { details: error })
            });
        }
    }

    async postDomain(req: Request, res: Response) {
        try {
            logger.debug('POST domain: '+req.body.domain);
            const domain = req.body.domain as string;

            const result = await domainService.createOrUpdateDomain(domain);

            res.json(result);
        } catch (error) {
            logger.error('POST domain error', { error });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

