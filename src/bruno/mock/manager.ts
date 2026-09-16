import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import * as net from 'node:net';
import { MockRoute } from './types.js';
import { saveMockConfig, loadMockConfig, mockConfigPath } from './config.js';
import { listServers, addServer, removeServer, logDir } from './state.js';

export interface CreateMockServerParams {
  collectionPath: string;
  name: string;
  routes: MockRoute[];
  port?: number;
}

export async function createMockServer(
  params: CreateMockServerParams
): Promise<{ success: boolean; configPath?: string; error?: string }> {
  try {
    const config = await saveMockConfig(params.collectionPath, params.name, params.routes, params.port);
    return { success: true, configPath: mockConfigPath(params.collectionPath, config.name) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function tryListen(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(port, () => {
      const address = probe.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      probe.close(() => resolve(actualPort));
    });
  });
}

async function findFreePort(preferred?: number): Promise<number> {
  if (preferred) {
    try {
      return await tryListen(preferred);
    } catch {
      // preferred port unavailable — fall through to an OS-assigned one
    }
  }
  return tryListen(0);
}

async function readLogTail(logFile: string, maxLines = 20): Promise<string> {
  try {
    const content = await fs.readFile(logFile, 'utf-8');
    return content.split('\n').slice(-maxLines).join('\n');
  } catch {
    return '(no log output)';
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForListening(logFile: string, pid: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isProcessAlive(pid)) return false;
    const content = await fs.readFile(logFile, 'utf-8').catch(() => '');
    if (content.includes('LISTENING on port')) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

export interface StartMockServerParams {
  collectionPath: string;
  name: string;
  port?: number;
}

/**
 * `runtimeScriptPath` (the compiled dist/bruno/mock/runtime.js) is injected by the
 * caller rather than self-located via import.meta.url here, so this module stays
 * free of syntax TypeScript rejects under a CommonJS module target — which matters
 * because this file is transitively pulled into the Jest test run (via server.ts)
 * the moment mock tools are registered, and tests transpile everything to CommonJS.
 * The real value is computed once in index.ts, the one file Jest never imports.
 */
export async function startMockServer(
  params: StartMockServerParams,
  runtimeScriptPath: string
): Promise<{ success: boolean; port?: number; url?: string; error?: string }> {
  try {
    const running = await listServers();
    if (running.some((s) => s.name === params.name)) {
      return { success: false, error: `Mock server "${params.name}" is already running` };
    }

    const configPath = mockConfigPath(params.collectionPath, params.name);
    const config = await loadMockConfig(configPath);
    const port = await findFreePort(params.port ?? config.port);

    await fs.mkdir(logDir(), { recursive: true });
    const logFile = join(logDir(), `${params.name}.log`);
    const logHandle = await fs.open(logFile, 'a');

    const child = spawn(process.execPath, [runtimeScriptPath, '--config', configPath, '--port', String(port)], {
      detached: true,
      stdio: ['ignore', logHandle.fd, logHandle.fd]
    });
    child.unref();
    await logHandle.close();

    if (child.pid === undefined) {
      return { success: false, error: 'Failed to spawn mock server process' };
    }

    const started = await waitForListening(logFile, child.pid, 3000);
    if (!started) {
      const tail = await readLogTail(logFile);
      return { success: false, error: `Mock server did not report as listening within 3s.\n${tail}` };
    }

    await addServer({
      name: params.name,
      pid: child.pid,
      port,
      configPath,
      collectionPath: params.collectionPath,
      startedAt: new Date().toISOString(),
      logFile
    });

    return { success: true, port, url: `http://localhost:${port}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function stopMockServer(name: string): Promise<{ success: boolean; error?: string }> {
  const removed = await removeServer(name);
  if (!removed) {
    return { success: false, error: `No running mock server named "${name}"` };
  }
  try {
    process.kill(removed.pid);
  } catch {
    // already gone — fine, it's removed from the registry either way
  }
  return { success: true };
}

export async function listMockServers() {
  return listServers();
}
