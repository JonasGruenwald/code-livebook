import { window } from "vscode";
const channel = window.createOutputChannel('Code LiveBook');

export const log = (...args: unknown[]) => {
  const out = args
    .map(arg => {
      switch (typeof arg) {
        case 'string':
          return arg;
        case 'number':
          return arg;
        case 'object':
          return JSON.stringify(arg);
        default:
          return String(arg);
      }
    })
    .join(' ');
  channel.appendLine(out);
};