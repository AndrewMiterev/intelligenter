export interface Domain {
    id?: number;
    domain_name: string;
    status: 'pending' | 'analyzing' | 'completed' | 'error';
    created_at?: Date;
    updated_at?: Date;
    last_analyzed?: Date;
    vt_data?: VirusTotalData | null;
    whois_data?: WhoisData | null;
}

export interface VirusTotalData {
    numberOfDetection: number;
    numberOfScanners: number;
    detectedEngines: string;
    lastUpdated: string;
}

export interface WhoisData {
    dateCreated: string;
    ownerName: string;
    expiredOn: string;
}

export interface AnalysisResult {
    domain: string;
    VTData?: VirusTotalData;
    WhoisData?: WhoisData;
    status?: string;
    message?: string;  // add for error message
}

