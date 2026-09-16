import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { saveMockConfig, loadMockConfig, mockConfigPath } from '../../src/bruno/mock/config.js';
import { MockRoute } from '../../src/bruno/mock/types.js';

describe('mock config (per-collection JSON)', () => {
  let collectionPath: string;

  beforeEach(async () => {
    collectionPath = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-mockconfig-test-'));
  });

  afterEach(async () => {
    await fs.rm(collectionPath, { recursive: true, force: true });
  });

  const routes: MockRoute[] = [{ method: 'GET', path: '/users', status: 200, body: '[]', bodyType: 'json' }];

  test('saves to .bruno-mcp/mocks/<sanitized-name>.json under the collection', async () => {
    const config = await saveMockConfig(collectionPath, 'My Mock Server!', routes, 4001);
    const expectedPath = join(collectionPath, '.bruno-mcp', 'mocks', 'my-mock-server.json');
    expect(mockConfigPath(collectionPath, 'My Mock Server!')).toBe(expectedPath);

    const loaded = await loadMockConfig(expectedPath);
    expect(loaded.name).toBe('My Mock Server!');
    expect(loaded.port).toBe(4001);
    expect(loaded.routes).toEqual(routes);
    expect(config.createdAt).toBe(loaded.createdAt);
  });

  test('preserves createdAt but bumps updatedAt on re-save', async () => {
    const first = await saveMockConfig(collectionPath, 'api', routes);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await saveMockConfig(collectionPath, 'api', [...routes, { method: 'POST', path: '/users', status: 201 }]);

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
    expect(second.routes).toHaveLength(2);
  });
});
