import fs from "node:fs";
import { spawn, ChildProcess } from 'node:child_process';
import { log } from './logger';
import { homedir } from 'node:os';
import { workspace, Uri } from "vscode";
import path from "node:path";

/**
 *  Livebook server URLs are constructed as follows:
 * 
 * BASE WITH TOKEN:
 * http://localhost:56762/?token=e6ipll3iqawrzbohnhfcglabtcsjmrmh
 * 
 * OPEN FILE:
 * http://localhost:56762/open?path=/Users/jonas/Projects/crow_echo/notebooks/tailscale_playground.livemd&token=e6ipll3iqawrzbohnhfcglabtcsjmrmh
 */

// Regex to parse the URL from the livebook server output
const urlMatcher = /\[Livebook\] Application running at (http:\/\/[^\n]*)/;

class LiveBookServer {

  viewers: number = 0;
  managed: boolean;
  url: string | undefined;
  ready: Promise<void>;
  processHandle?: ChildProcess;
  token?: string;
  stale = false;

  constructor() {
    const config = workspace.getConfiguration("code-livebook");
    const autoStartServer = config.get<boolean>("autoStartServer") ?? true;
    const liveBookPort = config.get<number>("livebookPort") ?? 0;
    const liveBookHost = config.get<string>("livebookHost") || "http://localhost";
    const liveBookRuntime = config.get<string>("livebookRuntime") || "standalone";
    const liveBookExectablePath = config.get<string>("livebookExecutablePath") || path.join(homedir(), ".mix", "escripts", "livebook");
    const livebookEnv = config.get<object>("livebookEnvironment") || {};
    this.managed = autoStartServer;
    if (this.managed) {
      if (!fs.existsSync(liveBookExectablePath)) {
        throw new Error(`LiveBook executable not found at ${liveBookExectablePath}`);
      }
      const environment = {
        "LIVEBOOK_WITHIN_IFRAME": "true",
        "LIVEBOOK_PORT": liveBookPort.toString(),
        "LIVEBOOK_SHUTDOWN_ENABLED": "false",
        "LIVEBOOK_DEFAULT_RUNTIME": liveBookRuntime,
        "PATH": process.env.PATH,
        "HOME": homedir(),
        ...livebookEnv
      };

      log(`Starting server at ${liveBookExectablePath} , Environment: 
${JSON.stringify(environment, null, 2)}`);

      // Start the livebook server
      this.processHandle = spawn(liveBookExectablePath, ["server"], {
        shell: true,
        env: environment
      });

      // Wait for the server to start, ready resolves when the server URL has been extracted
      this.ready = new Promise((resolve, reject) => {
        if (!this.processHandle) {
          reject(new Error("Server process handle not found"));
          return;
        } else if (!this.processHandle.stdout) {
          reject(new Error("Server process handle stdout not found"));
          return;
        }
        this.processHandle.stdout.on('data', (data) => {
          const output = data.toString();
          log(`LIVEBOOK SERVER STDOUT | ${output}`);
          if (this.url === undefined && output.includes("[Livebook] Application running at")) {
            const matches = output.match(urlMatcher);
            if (matches.length >= 2) {
              this.url = matches[1].trim();
              log(`Livebook server URL detected: ${this.url}`);
              resolve();
              return;
            }
          }
        });
        this.processHandle.stderr?.on('data', (data) => {
          log(`LIVEBOOK SERVER STDERR | ${data}`);
        });
        this.processHandle.on('close', (code) => {
          log(`Livebook Server process exited with code ${code}`);
          reject(new Error(`Livebook process exited with code ${code}`));
        });
      });

      this.processHandle.on('close', (code) => {
        this.stale = true;
      });

    } else {
      this.ready = Promise.resolve();
      this.url = `${liveBookHost}:${liveBookPort}`;
    }
  }

  getConnection = async (uri: Uri) => {
    await this.ready;
    const url = new URL(this.url!);
    url.pathname = "/open";
    url.searchParams.append("path", uri.fsPath);

    return {
      url: url.toString(),
      port: Number(url.port),
    };
  };

  terminate = () => {
    try {
      this.processHandle?.kill();
    } catch (e) {
      log("Couldn't kill livebook server process.");
    }
    log(`Shutting down server at ${this.url}`);
  };
}
export type { LiveBookServer };

let server: LiveBookServer | null = null;

export const getServer = (): LiveBookServer => {
  if (!server) {
    server = new LiveBookServer();
  }
  if (server.stale) {
    log("Server is stale, restarting");
    server.terminate();
    server = new LiveBookServer();
  }
  server.viewers++;
  return server;
};


/**
 * Terminate the LiveBook server if there are no more views open to it
 */
export const handleDisconnect = () => {
  if (server) {
    server.viewers--;
    if (server.viewers <= 0) {
      server.terminate();
      server = null;
    }
  } else {
    log('(Strange) Registered disconnect but no server found');
  }
};