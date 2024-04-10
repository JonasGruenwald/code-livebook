import * as vscode from 'vscode';
import { LiveBookServer, getServer, handleDisconnect } from './liveBookServer';
import { log } from './logger';


class ErrorDocument implements vscode.CustomDocument {
  uri: vscode.Uri;
  message: string;
  constructor(uri: vscode.Uri, message: string) {
    this.uri = uri;
    this.message = message;
  }
  dispose(): void {
    // no-op
  }
}

class LiveBookDocument implements vscode.CustomDocument {
  uri: vscode.Uri;
  server: LiveBookServer;
  constructor(uri: vscode.Uri) {
    this.uri = uri;
    log(`Opening ${uri.toString()}`);
    this.server = getServer();
  }
  dispose(): void {
    handleDisconnect();
  }
}

export class LiveBookViewer implements vscode.CustomReadonlyEditorProvider {

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new LiveBookViewer(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider('code-livebook.liveBookViewer', provider, {
      webviewOptions: {
        // I don't think there is a better way
        retainContextWhenHidden: true
      }
    });
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) { }

  async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<vscode.CustomDocument> {
    try {
      return new LiveBookDocument(uri);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred while opening the document.';
      return new ErrorDocument(uri, message);
    }
  }

  async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

    if (document instanceof LiveBookDocument) {
      const { url, port } = await document.server.getConnection(document.uri);
      webviewPanel.webview.options = {
        enableScripts: true,
        portMapping: [{ webviewPort: port, extensionHostPort: port }]
      };
      webviewPanel.webview.html = this.getIframeEmbed(url);
      return;
    } else if (document instanceof ErrorDocument) {
      webviewPanel.webview.html = this.getErrorDocument(document.message);
      return;
    }

    throw new Error('Unknown document type');
  }

  private getIframeEmbed(src: string): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <style>
            body{
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            iframe{
              width: 100vw;
              height: 100vh;
              border: none;
            }
            </style>
            <iframe 
            sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups" allow="cross-origin-isolated; autoplay; clipboard-read; clipboard-write"
            src="${src}"></iframe>
            <script>
            const vscode = acquireVsCodeApi();
            const iframe = document.querySelector('iframe');
            window.addEventListener("message", (e) => {
            console.log('iframe message received', e.data);
             const data = JSON.parse(e.data);
             if(data.type === 'keydown'){
              window.dispatchEvent(new KeyboardEvent('keydown', data));
             }
          }, false);
            </script>
            </html>`;
  }

  private getErrorDocument(message: string): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; script-src 'nonce-abc123';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code LiveBook</title>
            </head>
            <body>
            <h2>Could not initialize LiveBook</h2>
            <p>
            You are seeing this page instead of your LiveBook, because the extension could not start the LiveBook server.
            </p>
            <p>
            Most likely this is because the LiveBook server is not yet installed at the expected location.
            Please follow the Setup guide on the extension's README to set up the LiveBook server and adjust the extension settings to look for it in the correct place.
            </p>
            <p>
            The relevant setting is <code>code-livebook.livebookExecutablePath</code>, which should be set to the path of the LiveBook executable you have installed via escripts.
            </>
            <p>
            If you don't want the extension to manage the LiveBook server, you can disable the setting <code>code-livebook.autoStartServer</code> and provide the host and port of your own LiveBook server to connect to
            </p>
            <p>
            Please visit the extension settings for more information.
            <p/>
            <h2>Error message</h2>
            This is the error message from the extension:
            <pre>
            ${message}
            </pre>

            </body>
            </html>`;
  }
}