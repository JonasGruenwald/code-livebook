// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, window } from 'vscode';
import { LiveBookViewer } from './liveBookViewer.js';
import { log } from 'console';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  log('Extension activated');

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "code-livebook" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand('code-livebook.openNewLiveBook', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    window.showInformationMessage('Not implemented yet!');
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(LiveBookViewer.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {
  log('Extension deactivated');
}
