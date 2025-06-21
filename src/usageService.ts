import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { UsageBlock, UsageData, PlanLimits, ExtensionConfig } from './types';

export class UsageService {
    private static readonly PLAN_LIMITS: PlanLimits = {
        pro: 100000,
        max5: 500000,
        max20: 2000000
    };

    private config: ExtensionConfig;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration('ccm');
        return {
            refreshInterval: config.get('refreshInterval', 3),
            planType: config.get('planType', 'pro'),
            resetHour: config.get('resetHour', 0),
            showInStatusBar: config.get('showInStatusBar', true),
            warnThreshold: config.get('warnThreshold', 0.8)
        };
    }

    public updateConfig(): void {
        this.config = this.loadConfig();
    }

    public async fetchUsageData(): Promise<UsageData | null> {
        try {
            const blocks = await this.executeClaudeUsageCommand();
            if (!blocks) {
                return null;
            }

            const usageData = this.processUsageBlocks(blocks);
            return usageData;
        } catch (error) {
            console.error('Error fetching usage data:', error);
            return null;
        }
    }

    private executeClaudeUsageCommand(): Promise<UsageBlock[] | null> {
        return new Promise((resolve, reject) => {
            const process = spawn('ccusage', ['blocks', '--json']);
            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const blocks = JSON.parse(output) as UsageBlock[];
                        resolve(blocks);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse usage data: ${parseError}`));
                    }
                } else {
                    reject(new Error(`ccusage command failed with code ${code}: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to execute ccusage command: ${error.message}`));
            });
        });
    }

    private processUsageBlocks(blocks: UsageBlock[]): UsageData {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        let totalTokens = 0;
        let activeTokens = 0;
        let tokensInLastHour = 0;

        for (const block of blocks) {
            totalTokens += block.totalTokens;
            
            if (block.isActive) {
                activeTokens += block.totalTokens;
            }

            const blockStart = new Date(block.startTime);
            const blockEnd = block.actualEndTime ? new Date(block.actualEndTime) : now;

            if (blockEnd > oneHourAgo) {
                const overlapStart = blockStart > oneHourAgo ? blockStart : oneHourAgo;
                const overlapDuration = blockEnd.getTime() - overlapStart.getTime();
                const totalDuration = blockEnd.getTime() - blockStart.getTime();
                
                if (totalDuration > 0) {
                    const proportionalTokens = (block.totalTokens * overlapDuration) / totalDuration;
                    tokensInLastHour += proportionalTokens;
                }
            }
        }

        const burnRate = tokensInLastHour / 60;
        const tokenLimit = UsageService.PLAN_LIMITS[this.config.planType];
        const remainingTokens = tokenLimit - totalTokens;
        const timeToLimit = burnRate > 0 ? remainingTokens / burnRate : Infinity;

        const resetTime = this.getNextResetTime();

        return {
            blocks,
            totalTokens,
            activeTokens,
            burnRate,
            timeToLimit,
            resetTime,
            planType: this.config.planType,
            tokenLimit
        };
    }

    private getNextResetTime(): Date {
        const now = new Date();
        const resetTime = new Date();
        resetTime.setUTCHours(this.config.resetHour, 0, 0, 0);

        if (resetTime <= now) {
            resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        }

        return resetTime;
    }

    public formatUsageForStatusBar(usage: UsageData): string {
        const percentage = (usage.totalTokens / usage.tokenLimit) * 100;
        let icon = '$(pulse)';
        
        if (percentage > 90) {
            icon = '$(error)';
        } else if (percentage > (this.config.warnThreshold * 100)) {
            icon = '$(warning)';
        }
        
        return `${icon} ${this.formatNumber(usage.totalTokens)}/${this.formatNumber(usage.tokenLimit)}`;
    }

    public formatBurnRate(burnRate: number): string {
        if (burnRate < 1) {
            return `${Math.round(burnRate * 60)} tokens/hour`;
        }
        return `${Math.round(burnRate)} tokens/min`;
    }

    public formatTimeToLimit(minutes: number): string {
        if (!isFinite(minutes)) {
            return 'Never at current rate';
        }
        
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${mins}m`;
        } else {
            return `${mins}m`;
        }
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    }
}