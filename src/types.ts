export interface UsageBlock {
    startTime: string;
    totalTokens: number;
    isActive: boolean;
    isGap: boolean;
    actualEndTime?: string;
}

export interface UsageData {
    blocks: UsageBlock[];
    totalTokens: number;
    activeTokens: number;
    burnRate: number;
    timeToLimit: number;
    resetTime: Date;
    planType: 'pro' | 'max5' | 'max20';
    tokenLimit: number;
}

export interface PlanLimits {
    pro: number;
    max5: number;
    max20: number;
}

export interface ExtensionConfig {
    refreshInterval: number;
    planType: 'pro' | 'max5' | 'max20';
    resetHour: number;
    showInStatusBar: boolean;
    warnThreshold: number;
}