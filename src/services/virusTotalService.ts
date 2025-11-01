import axios from 'axios';
import * as rax from 'retry-axios';
import logger from '../utils/logger';
import {VirusTotalData} from "../models/domain";

export class VirusTotalService {
    private apiKey: string;
    private axiosInstance: any;

    constructor() {
        this.apiKey = process.env.VIRUSTOTAL_API_KEY || '';
        this.axiosInstance = axios.create();
        rax.attach(this.axiosInstance);
        this.axiosInstance.defaults.raxConfig = {
            retry: 3,
            retryDelay: 1000,
            backoffType: 'exponential',
            onRetryAttempt: (err: any) => {
                logger.warn('Retrying VirusTotal request', { error: err.message });
            }
        };
    }

    async analyzeDomain(domain: string): Promise<VirusTotalData> {
        // logger.info('Virus Total Service API Key '+this.apiKey);
        if (!this.apiKey) {
            logger.warn('VirusTotal API key missing, using mock data');
            return this.getMockData(domain);
        }

        try {
            const response = await this.axiosInstance.get(
                `https://www.virustotal.com/api/v3/domains/${domain}`,
                {
                    headers: {
                        'x-apikey': this.apiKey
                    }
                }
            );

            return this.parseVirusTotalData(response.data);
        } catch (error) {
            logger.error('VirusTotal API error', {error});
            if (process.env.MOCK_MODE === 'true') {
                logger.warn('Using mock VT data');
                return this.getMockData(domain);
            }
            throw error;  // Let upper handle
        }
    }

    private parseVirusTotalData(data: any): VirusTotalData {
        const lastAnalysisStats = data.data.attributes.last_analysis_stats || {};
        const detections = lastAnalysisStats.malicious || 0;
        const scanners = Object.keys(data.data.attributes.last_analysis_results || {}).length;
        const detectedEngine = Object.entries(data.data.attributes.last_analysis_results || {})
            .find(([_, result]: any) => result.category === 'malicious')?.[0] || 'CLEAN MX';
        const lastUpdated = new Date(data.data.attributes.last_analysis_date * 1000).toISOString().split('T')[0].replace(/-/g, '.');

        return {
            numberOfDetection: detections,
            numberOfScanners: scanners,
            detectedEngines: detectedEngine,
            lastUpdated
        };
    }

    private getMockData(domain: string): VirusTotalData {
        return {
            numberOfDetection: Math.floor(Math.random() * 5),
            numberOfScanners: 70,
            detectedEngines: "CLEAN MX",
            lastUpdated: new Date().toISOString().split('T')[0].replace(/-/g, '.')
        };
    }
}

