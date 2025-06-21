import * as vscode from 'vscode';
import { UsageData } from './types';
import { UsageService } from './usageService';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private usageService: UsageService;

    constructor(usageService: UsageService) {
        this.usageService = usageService;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'ccm.showUsage';
        this.statusBarItem.show();
    }

    public updateUsage(usage: UsageData | null): void {
        if (!usage) {
            this.statusBarItem.text = '$(error) Claude Usage: Error';
            this.statusBarItem.tooltip = 'Failed to fetch Claude usage data. Click to retry.';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            return;
        }

        const text = this.usageService.formatUsageForStatusBar(usage);
        const percentage = (usage.totalTokens / usage.tokenLimit) * 100;
        
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = this.buildTooltip(usage);
        
        if (percentage > 90) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (percentage > 80) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    private buildTooltip(usage: UsageData): string {
        const percentage = (usage.totalTokens / usage.tokenLimit) * 100;
        return [
            `${usage.planType.toUpperCase()}: ${percentage.toFixed(1)}% used`,
            `Burn: ${this.usageService.formatBurnRate(usage.burnRate)}`,
            `Limit in: ${this.usageService.formatTimeToLimit(usage.timeToLimit)}`,
            `Reset: ${usage.resetTime.toLocaleTimeString()}`,
            `Click for details`
        ].join(' • ');
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}