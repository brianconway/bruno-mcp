import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { createCollectionManager } from '../../src/bruno/collection.js';
import { createRequestBuilder } from '../../src/bruno/request.js';

describe('CollectionManager', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('createCollection writes bruno.json, environments/, .gitignore, README.md', async () => {
    const manager = createCollectionManager();
    const result = await manager.createCollection({
      name: 'my-api',
      outputPath: tmpRoot,
      baseUrl: 'https://api.example.com',
    });

    expect(result.success).toBe(true);
    const collectionPath = result.path!;
    const config = await manager.loadCollection(collectionPath);
    expect(config.name).toBe('my-api');
    expect(config.type).toBe('collection');

    const entries = await fs.readdir(collectionPath);
    expect(entries).toEqual(expect.arrayContaining(['bruno.json', 'environments', '.gitignore', 'README.md']));
  });

  test('getCollectionStats tallies requests by method after real parsing', async () => {
    const collectionManager = createCollectionManager();
    const requestBuilder = createRequestBuilder();
    const { path: collectionPath } = await collectionManager.createCollection({
      name: 'stats-test',
      outputPath: tmpRoot,
    });

    await requestBuilder.createRequest({
      collectionPath: collectionPath!,
      name: 'Get Widgets',
      method: 'GET',
      url: '{{baseUrl}}/widgets',
    });
    await requestBuilder.createRequest({
      collectionPath: collectionPath!,
      name: 'Get Gadgets',
      method: 'GET',
      url: '{{baseUrl}}/gadgets',
    });
    await requestBuilder.createRequest({
      collectionPath: collectionPath!,
      name: 'Create Widget',
      method: 'POST',
      url: '{{baseUrl}}/widgets',
      body: { type: 'json', content: '{"name":"x"}' },
    });

    const stats = await collectionManager.getCollectionStats(collectionPath!);
    expect(stats.totalRequests).toBe(3);
    expect(stats.requestsByMethod).toEqual({ GET: 2, POST: 1 });
  });

  test('listCollections finds a nested collection by its bruno.json', async () => {
    const manager = createCollectionManager();
    const nestedRoot = join(tmpRoot, 'projects', 'service-a');
    await fs.mkdir(nestedRoot, { recursive: true });
    await manager.createCollection({ name: 'service-a-api', outputPath: join(tmpRoot, 'projects') });

    const collections = await manager.listCollections(tmpRoot);
    expect(collections).toHaveLength(1);
    expect(collections[0].name).toBe('service-a-api');
    expect(collections[0].path).toBe(join(tmpRoot, 'projects', 'service-a-api'));
  });
});
