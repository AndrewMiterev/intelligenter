import { Request, Response } from 'express';
import { DomainService } from '../services/domainService';
import logger from '../utils/logger';

const domainService = new DomainService();

export class DomainController {
    async getDomain(req: Request, res: Response) {
        try {
            logger.debug('Get Domain Controller: '+req.query.domain);
            const domain = req.query.domain as string;

            const domainData = await domainService.getDomain(domain);

            if (!domainData) {
                const analysisResult = await domainService.createOrUpdateDomain(domain);
                return res.json(analysisResult);
            }

            res.json(domainData);
        } catch (error) {
            logger.error('GET domain error', { error });
            res.status(500).json({ error: 'Internal server error' });
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

