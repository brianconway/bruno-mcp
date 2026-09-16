import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { createMockServer } from '../../src/bruno/mock/manager.js';

describe('createMockServer', () => {
  let collectionPath: string;

  beforeEach(async () => {
    collectionPath = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-mockmanager-test-'));
  });

  afterEach(async () => {
    await fs.rm(collectionPath, { recursive: true, force: true });
  });

  test('writes a config file and reports its path', async () => {
    const result = await createMockServer({
      collectionPath,
      name: 'api',
      routes: [{ method: 'GET', path: '/ping', status: 200, body: 'pong', bodyType: 'text' }]
    });

    expect(result.success).toBe(true);
    expect(result.configPath).toBe(join(collectionPath, '.bruno-mcp', 'mocks', 'api.json'));
    const content = JSON.parse(await fs.readFile(result.configPath!, 'utf-8'));
    expect(content.routes).toHaveLength(1);
  });
});

describe('stopMockServer', () => {
  beforeEach(async () => {
    process.env.BRUNO_MCP_STATE_DIR = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-mockmanager-state-'));
    jest.resetModules();
  });

  afterEach(async () => {
    const dir = process.env.BRUNO_MCP_STATE_DIR;
    delete process.env.BRUNO_MCP_STATE_DIR;
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  test('reports failure for a server that is not tracked as running', async () => {
    const { stopMockServer } = await import('../../src/bruno/mock/manager.js');
    const result = await stopMockServer('never-started');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No running mock server/);
  });
});
