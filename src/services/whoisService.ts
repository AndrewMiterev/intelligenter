import whois from 'whois-json';
import logger from '../utils/logger';
import {WhoisData} from "../models/domain";

export class WhoisService {
    async analyzeDomain(domain: string): Promise<WhoisData> {
        let attempts = 0;
        const maxRetries = 3;
        const backoff = (attempt: number) => Math.pow(2, attempt) * 1000;

        while (attempts < maxRetries) {
            try {
                const data = await whois(domain);
                return this.parseWhoisData(data);
            } catch (error) {
                attempts++;
                logger.warn(`Whois retry attempt ${attempts}/${maxRetries}`, { error });
                if (attempts >= maxRetries) {
                    logger.error('Whois analysis failed after retries', {error});
                    if (process.env.MOCK_MODE === 'true') {
                        return this.getMockData(domain);
                    }
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, backoff(attempts)));
            }
        }
        return this.getMockData(domain); // Fallback
    }

    private parseWhoisData(data: any): WhoisData {
        return {
            dateCreated: data.creationDate || data.createdDate || data.created || 'Unknown',
            ownerName: data.registrantOrganization || data.registrantName || 'Unknown',
            expiredOn: data.expiryDate || data.expirationDate || data.expires || 'Unknown'
        };
    }

    private getMockData(domain: string): WhoisData {
        const currentYear = new Date().getFullYear();
        return {
            dateCreated: '09.15.97',
            ownerName: 'MarkMonitor, Inc.',
            expiredOn: `09.13.${currentYear + 5}`
        };
    }
}

