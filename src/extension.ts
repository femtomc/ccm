import * as vscode from 'vscode';
import { UsageService } from './usageService';
import { StatusBarManager } from './statusBarManager';
import { WebviewProvider } from './webviewProvider';
import { UsageData } from './types';

export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Code Monitor is now active!');

	const usageService = new UsageService();
	const statusBarManager = new StatusBarManager(usageService);
	const webviewProvider = new WebviewProvider(usageService);

	let currentUsage: UsageData | null = null;
	let refreshTimer: NodeJS.Timer | undefined;

	async function updateUsage() {
		try {
			const newUsage = await usageService.fetchUsageData();
			if (newUsage) {
				currentUsage = newUsage;
			}
			statusBarManager.updateUsage(currentUsage);
		} catch (error) {
			console.error('Failed to update usage data:', error);
			statusBarManager.updateUsage(null);
		}
	}

	function startRefreshTimer() {
		const config = vscode.workspace.getConfiguration('ccm');
		const interval = config.get('refreshInterval', 3) * 1000;
		
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}
		
		refreshTimer = setInterval(updateUsage, interval);
	}

	const showUsageCommand = vscode.commands.registerCommand('ccm.showUsage', () => {
		webviewProvider.showUsagePanel(currentUsage);
	});

	const refreshUsageCommand = vscode.commands.registerCommand('ccm.refreshUsage', async () => {
		await updateUsage();
		vscode.window.showInformationMessage('Claude usage data refreshed');
	});

	const openSettingsCommand = vscode.commands.registerCommand('ccm.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'ccm');
	});

	const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('ccm')) {
			usageService.updateConfig();
			startRefreshTimer();
			updateUsage();
		}
	});

	context.subscriptions.push(
		showUsageCommand,
		refreshUsageCommand,
		openSettingsCommand,
		configurationChangeListener,
		statusBarManager,
		webviewProvider
	);

	updateUsage();
	startRefreshTimer();
}

export function deactivate() {
	console.log('Claude Code Monitor deactivated');
}