import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as vscode from 'vscode';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: any;
};

export class MCPClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, (response: JsonRpcResponse) => void>();

  constructor(private command: string, private args: string[] = []) {}

  start() {
    if (this.proc) {
      return;
    }
    this.proc = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let buffer = '';

    this.proc.stdout.on('data', (data) => {
      buffer += data.toString();
      let boundary;
      while ((boundary = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          const handler = this.pending.get(msg.id);
          if (handler) {
            this.pending.delete(msg.id);
            handler(msg);
          }
        } catch (e) {
          console.error('Failed to parse MCP server response:', e, line);
        }
      }
    });

    this.proc.stderr.on('data', (data) => {
      console.error('MCP server stderr:', data.toString());
    });

    this.proc.on('exit', (code) => {
      console.log('MCP server exited with code', code);
      this.proc = null;
    });
  }

  stop() {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  async call(method: string, params?: any): Promise<any> {
    if (!this.proc) {
      vscode.window.showErrorMessage('MCP server is not running.');
      throw new Error('MCP server not running');
    }
    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    return new Promise((resolve, reject) => {
      this.pending.set(id, (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.result);
        }
      });
      this.proc?.stdin?.write(JSON.stringify(request) + '\n');
    });
  }
}

import * as path from 'path';

const mcpServerPath = path.join(__dirname, '../../../sightline-mcp-server/dist/index.js');
export const mcpClient = new MCPClient('node', [mcpServerPath]);
