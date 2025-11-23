import * as vscode from 'vscode';
import { WebviewManager } from './WebviewManager';

let webviewManager: WebviewManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
    webviewManager = new WebviewManager(context);

    const openSearchCommand = vscode.commands.registerCommand(
        'custom-search.openSearch',
        () => {
            webviewManager?.show();
        }
    );

    context.subscriptions.push(openSearchCommand);
}

export function deactivate(): void {
    webviewManager?.dispose();
}
