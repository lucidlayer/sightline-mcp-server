import * as vscode from 'vscode';
import { mcpClient } from './mcpClient';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Start MCP client process
	mcpClient.start();

	console.log('Congratulations, your extension "sightline-dashboard" is now active in the web extension host!');

	// Register a WebviewViewProvider for the sidebar view
	const provider: vscode.WebviewViewProvider = {
		resolveWebviewView(webviewView: vscode.WebviewView) {
			webviewView.webview.options = {
				enableScripts: true
			};
			webviewView.webview.html = getWebviewContent(webviewView.webview);

			webviewView.webview.onDidReceiveMessage(
				async (message) => {
					switch (message.type) {
						case 'requestSnapshots': {
							try {
								const result = await mcpClient.call('get_snapshot_history', { snapshotId: '' });
								webviewView.webview.postMessage({ type: 'snapshots', data: result });
							} catch (e) {
								webviewView.webview.postMessage({ type: 'snapshots', data: ['Error fetching snapshots'] });
							}
							break;
						}
						case 'requestValidation': {
							try {
								const result = await mcpClient.call('get_validation_results', { snapshotId: '' });
								webviewView.webview.postMessage({ type: 'validation', data: result });
							} catch (e) {
								webviewView.webview.postMessage({ type: 'validation', data: ['Error fetching validation results'] });
							}
							break;
						}
						case 'requestDiffs': {
							try {
								const result = await mcpClient.call('get_snapshot_diffs', { snapshotId: '' });
								webviewView.webview.postMessage({ type: 'diffs', data: result });
							} catch (e) {
								webviewView.webview.postMessage({ type: 'diffs', data: ['Error fetching diffs'] });
							}
							break;
						}
						case 'requestGraph': {
							try {
								const result = await mcpClient.call('search_nodes', { query: '' });
								webviewView.webview.postMessage({ type: 'graph', data: result });
							} catch (e) {
								webviewView.webview.postMessage({ type: 'graph', data: ['Error fetching graph data'] });
							}
							break;
						}
					}
				},
				undefined,
				context.subscriptions
			);
		}
	};

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('sightlineDashboardView', provider)
	);

	// Optional: keep the existing command to open a separate panel
	const disposable = vscode.commands.registerCommand('sightline-dashboard.showDashboard', () => {
		const panel = vscode.window.createWebviewPanel(
			'sightlineDashboard',
			'Sightline Dashboard',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		panel.webview.html = getWebviewContent(panel.webview);

		panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.type) {
					case 'requestSnapshots': {
						try {
							const result = await mcpClient.call('get_snapshot_history', { snapshotId: '' });
							panel.webview.postMessage({ type: 'snapshots', data: result });
						} catch (e) {
							panel.webview.postMessage({ type: 'snapshots', data: ['Error fetching snapshots'] });
						}
						break;
					}
					case 'requestValidation': {
						try {
							const result = await mcpClient.call('get_validation_results', { snapshotId: '' });
							panel.webview.postMessage({ type: 'validation', data: result });
						} catch (e) {
							panel.webview.postMessage({ type: 'validation', data: ['Error fetching validation results'] });
						}
						break;
					}
					case 'requestDiffs': {
						try {
							const result = await mcpClient.call('get_snapshot_diffs', { snapshotId: '' });
							panel.webview.postMessage({ type: 'diffs', data: result });
						} catch (e) {
							panel.webview.postMessage({ type: 'diffs', data: ['Error fetching diffs'] });
						}
						break;
					}
					case 'requestGraph': {
						try {
							const result = await mcpClient.call('search_nodes', { query: '' });
							panel.webview.postMessage({ type: 'graph', data: result });
						} catch (e) {
							panel.webview.postMessage({ type: 'graph', data: ['Error fetching graph data'] });
						}
						break;
					}
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);

	function getWebviewContent(webview: vscode.Webview): string {
		const nonce = getNonce();
		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Sightline Dashboard</title>
				<style>
					body { font-family: sans-serif; padding: 10px; }
					h1 { color: #007acc; }
					section { margin-bottom: 20px; }
					section h2 { font-size: 1.2em; margin-bottom: 5px; }
					.placeholder { padding: 10px; border: 1px dashed #ccc; background: #f9f9f9; }
				</style>
			</head>
			<body>
				<h1>Sightline Dashboard</h1>
				<button onclick="requestData()">Refresh Data</button>
				<section>
					<h2>Snapshots</h2>
					<div id="snapshots" class="placeholder">Snapshot data will appear here.</div>
				</section>
				<section>
					<h2>Validation Results</h2>
					<div id="validation" class="placeholder">Validation results will appear here.</div>
				</section>
				<section>
					<h2>Diffs</h2>
					<div id="diffs" class="placeholder">Diff information will appear here.</div>
				</section>
				<section>
					<h2>Knowledge Graph</h2>
					<div id="graph" class="placeholder">Graph data will appear here.</div>
				</section>
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();

					function requestData() {
						vscode.postMessage({ type: 'requestSnapshots' });
						vscode.postMessage({ type: 'requestValidation' });
						vscode.postMessage({ type: 'requestDiffs' });
						vscode.postMessage({ type: 'requestGraph' });
					}

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.type) {
							case 'snapshots':
								document.getElementById('snapshots').innerText = JSON.stringify(message.data, null, 2);
								break;
							case 'validation':
								document.getElementById('validation').innerText = JSON.stringify(message.data, null, 2);
								break;
							case 'diffs':
								document.getElementById('diffs').innerText = JSON.stringify(message.data, null, 2);
								break;
							case 'graph':
								document.getElementById('graph').innerText = JSON.stringify(message.data, null, 2);
								break;
						}
					});

					// Initial data fetch
					requestData();
				</script>
			</body>
			</html>
		`;
	}

	function getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
