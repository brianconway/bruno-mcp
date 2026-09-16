/**
 * Global registry of currently-running mock server processes, tracked in
 * ~/.bruno-mcp/state (not per-project), so `list_mock_servers` can show everything
 * running across every collection on the machine. Overridable via
 * BRUNO_MCP_STATE_DIR (used by tests to avoid touching the real home directory).
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import * as os from 'node:os';
import { MockServerInstance, MockServerState } from './types.js';

function stateDir(): string {
  return process.env.BRUNO_MCP_STATE_DIR || join(os.homedir(), '.bruno-mcp', 'state');
}

function stateFile(): string {
  return join(stateDir(), 'mock-servers.json');
}

function lockFile(): string {
  return `${stateFile()}.lock`;
}

export function logDir(): string {
  return join(stateDir(), 'logs');
}

async function acquireLock(retries = 50, delayMs = 20): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const handle = await fs.open(lockFile(), 'wx');
      await handle.close();
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Timed out acquiring the mock-server state lock');
}

async function releaseLock(): Promise<void> {
  await fs.rm(lockFile(), { force: true });
}

async function readState(): Promise<MockServerState> {
  try {
    const content = await fs.readFile(stateFile(), 'utf-8');
    return JSON.parse(content) as MockServerState;
  } catch {
    return { servers: [] };
  }
}

async function writeState(state: MockServerState): Promise<void> {
  await fs.mkdir(stateDir(), { recursive: true });
  await fs.writeFile(stateFile(), JSON.stringify(state, null, 2));
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the state, drops any entries whose process is no longer alive (handles a
 * mock server killed outside these tools, e.g. via Task Manager), lets the callback
 * mutate the reconciled list, then persists it — all under the lock.
 */
async function withState<T>(fn: (state: MockServerState) => T): Promise<T> {
  await fs.mkdir(stateDir(), { recursive: true });
  await acquireLock();
  try {
    const state = await readState();
    state.servers = state.servers.filter((s) => isProcessAlive(s.pid));
    const result = fn(state);
    await writeState(state);
    return result;
  } finally {
    await releaseLock();
  }
}

export async function listServers(): Promise<MockServerInstance[]> {
  return withState((state) => [...state.servers]);
}

export async function addServer(instance: MockServerInstance): Promise<void> {
  await withState((state) => {
    state.servers = state.servers.filter((s) => s.name !== instance.name);
    state.servers.push(instance);
  });
}

export async function removeServer(name: string): Promise<MockServerInstance | undefined> {
  return withState((state) => {
    const idx = state.servers.findIndex((s) => s.name === name);
    if (idx === -1) return undefined;
    const [removed] = state.servers.splice(idx, 1);
    return removed;
  });
}
