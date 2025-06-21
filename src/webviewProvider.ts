import * as vscode from 'vscode';
import { UsageData } from './types';
import { UsageService } from './usageService';

export class WebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private usageService: UsageService;

    constructor(usageService: UsageService) {
        this.usageService = usageService;
    }

    public showUsagePanel(usage: UsageData | null): void {
        if (this.panel) {
            this.panel.reveal();
        } else {
            this.createPanel();
        }
        
        if (this.panel) {
            this.updateContent(usage);
        }
    }

    private createPanel(): void {
        this.panel = vscode.window.createWebviewPanel(
            'claudeUsage',
            'Claude Code Usage',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        vscode.commands.executeCommand('ccm.refreshUsage');
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('ccm.openSettings');
                        break;
                }
            }
        );
    }

    private updateContent(usage: UsageData | null): void {
        if (!this.panel) return;

        if (!usage) {
            this.panel.webview.html = this.getErrorHtml();
            return;
        }

        this.panel.webview.html = this.getUsageHtml(usage);
    }

    private getErrorHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Claude Usage Monitor</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 5px;
                }
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <h1>Claude Code Usage Monitor</h1>
            <div class="error">
                <h3>Error Loading Usage Data</h3>
                <p>Failed to fetch Claude usage data. This could be due to:</p>
                <ul>
                    <li>The <code>ccusage</code> command not being available</li>
                    <li>Network connectivity issues</li>
                    <li>Authentication problems</li>
                </ul>
                <p>Please ensure you have the Claude CLI tools installed and configured.</p>
            </div>
            <button class="btn" onclick="refresh()">Retry</button>
            <button class="btn" onclick="openSettings()">Open Settings</button>
            
            <script>
                const vscode = acquireVsCodeApi();
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
                function openSettings() {
                    vscode.postMessage({ command: 'openSettings' });
                }
            </script>
        </body>
        </html>`;
    }

    private getUsageHtml(usage: UsageData): string {
        const percentage = (usage.totalTokens / usage.tokenLimit) * 100;
        const progressColor = percentage > 90 ? '#ff4444' : percentage > 80 ? '#ffaa00' : '#00aa44';
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Claude Usage Monitor</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
                    font-size: 13px;
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    padding: 16px;
                    line-height: 1.4;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                .actions {
                    display: flex;
                    gap: 8px;
                }
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    font-size: 11px;
                    border-radius: 2px;
                    cursor: pointer;
                    font-family: inherit;
                }
                .btn:hover { background: var(--vscode-button-hoverBackground); }
                
                .main-stats {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    padding: 12px;
                    margin-bottom: 12px;
                }
                .progress-container {
                    margin-bottom: 12px;
                }
                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    margin-bottom: 4px;
                    color: var(--vscode-descriptionForeground);
                }
                .progress-bar {
                    height: 6px;
                    background: var(--vscode-panel-border);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: ${progressColor};
                    transition: width 0.2s ease;
                    border-radius: 3px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    font-size: 11px;
                }
                .stat {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                }
                .stat-label { color: var(--vscode-descriptionForeground); }
                .stat-value { 
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .burn-rate {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    padding: 8px;
                    margin-bottom: 12px;
                    font-size: 11px;
                }
                .burn-rate-header {
                    font-weight: 600;
                    margin-bottom: 6px;
                    font-size: 12px;
                }
                .burn-stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .burn-value {
                    font-weight: 600;
                    color: ${progressColor};
                }
                .time-to-limit {
                    color: var(--vscode-descriptionForeground);
                }
                
                .blocks {
                    margin-top: 8px;
                }
                .blocks-header {
                    font-weight: 600;
                    font-size: 12px;
                    margin-bottom: 8px;
                    color: var(--vscode-foreground);
                }
                .block {
                    background: var(--vscode-input-background);
                    border-left: 3px solid var(--vscode-panel-border);
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    font-size: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .block.active {
                    border-left-color: #00aa44;
                    background: rgba(0, 170, 68, 0.05);
                }
                .block-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .block-time {
                    color: var(--vscode-descriptionForeground);
                }
                .block-tokens {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                .block-status {
                    font-size: 9px;
                    padding: 1px 4px;
                    border-radius: 2px;
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                }
                .active-indicator { 
                    color: #00aa44; 
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">Claude Usage</div>
                <div class="actions">
                    <button class="btn" onclick="refresh()">↻</button>
                    <button class="btn" onclick="openSettings()">⚙</button>
                </div>
            </div>
            
            <div class="main-stats">
                <div class="progress-container">
                    <div class="progress-label">
                        <span>${usage.totalTokens.toLocaleString()}</span>
                        <span>${usage.tokenLimit.toLocaleString()} (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage.toFixed(1)}%"></div>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat">
                        <span class="stat-label">PLAN</span>
                        <span class="stat-value">${usage.planType.toUpperCase()}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">ACTIVE</span>
                        <span class="stat-value">${usage.activeTokens.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="burn-rate">
                <div class="burn-rate-header">Burn Rate</div>
                <div class="burn-stats">
                    <span class="burn-value">${this.usageService.formatBurnRate(usage.burnRate)}</span>
                    <span class="time-to-limit">limit in ${this.usageService.formatTimeToLimit(usage.timeToLimit)}</span>
                </div>
            </div>
            
            <div class="blocks">
                <div class="blocks-header">Sessions (${usage.blocks.length})</div>
                ${usage.blocks.slice(0, 8).map(block => `
                    <div class="block ${block.isActive ? 'active' : ''}">
                        <div class="block-info">
                            <div class="block-time">${new Date(block.startTime).toLocaleTimeString()}</div>
                            <div class="block-tokens">${block.totalTokens.toLocaleString()} tokens</div>
                        </div>
                        <div class="block-status ${block.isActive ? 'active-indicator' : ''}">
                            ${block.isActive ? '●' : '○'}
                        </div>
                    </div>
                `).join('')}
                ${usage.blocks.length > 8 ? `<div style="text-align: center; color: var(--vscode-descriptionForeground); font-size: 10px; padding: 4px;">+${usage.blocks.length - 8} more</div>` : ''}
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }
                function openSettings() {
                    vscode.postMessage({ command: 'openSettings' });
                }
            </script>
        </body>
        </html>`;
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}