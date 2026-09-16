import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';

describe('mock server state registry', () => {
  let stateDir: string;
  let listServers: typeof import('../../src/bruno/mock/state.js').listServers;
  let addServer: typeof import('../../src/bruno/mock/state.js').addServer;
  let removeServer: typeof import('../../src/bruno/mock/state.js').removeServer;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-state-test-'));
    process.env.BRUNO_MCP_STATE_DIR = stateDir;
    // state.ts reads the env var at call time via a function, but re-require fresh
    // per test anyway to avoid any module-level caching surprises across tests.
    jest.resetModules();
    ({ listServers, addServer, removeServer } = await import('../../src/bruno/mock/state.js'));
  });

  afterEach(async () => {
    delete process.env.BRUNO_MCP_STATE_DIR;
    await fs.rm(stateDir, { recursive: true, force: true });
  });

  test('starts empty', async () => {
    expect(await listServers()).toEqual([]);
  });

  test('adds and lists a server tracked against a real (alive) pid', async () => {
    await addServer({
      name: 'api-mock',
      pid: process.pid, // the test runner itself — guaranteed alive
      port: 4001,
      configPath: '/fake/config.json',
      collectionPath: '/fake/collection',
      startedAt: new Date().toISOString(),
      logFile: '/fake/log.txt'
    });

    const servers = await listServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe('api-mock');
    expect(servers[0].port).toBe(4001);
  });

  test('adding a server with the same name replaces the previous entry', async () => {
    const base = {
      pid: process.pid,
      configPath: '/fake/config.json',
      startedAt: new Date().toISOString(),
      logFile: '/fake/log.txt'
    };
    await addServer({ ...base, name: 'api-mock', port: 4001 });
    await addServer({ ...base, name: 'api-mock', port: 4002 });

    const servers = await listServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].port).toBe(4002);
  });

  test('reconciliation drops entries whose process is no longer alive', async () => {
    await addServer({
      name: 'dead-mock',
      pid: 999999, // extremely unlikely to be a real running pid
      port: 4003,
      configPath: '/fake/config.json',
      startedAt: new Date().toISOString(),
      logFile: '/fake/log.txt'
    });
    await addServer({
      name: 'alive-mock',
      pid: process.pid,
      port: 4004,
      configPath: '/fake/config.json',
      startedAt: new Date().toISOString(),
      logFile: '/fake/log.txt'
    });

    const servers = await listServers();
    expect(servers.map((s) => s.name)).toEqual(['alive-mock']);
  });

  test('removeServer removes by name and returns the removed instance', async () => {
    await addServer({
      name: 'api-mock',
      pid: process.pid,
      port: 4001,
      configPath: '/fake/config.json',
      startedAt: new Date().toISOString(),
      logFile: '/fake/log.txt'
    });

    const removed = await removeServer('api-mock');
    expect(removed?.name).toBe('api-mock');
    expect(await listServers()).toEqual([]);
  });

  test('removeServer returns undefined for an unknown name', async () => {
    expect(await removeServer('does-not-exist')).toBeUndefined();
  });
});
