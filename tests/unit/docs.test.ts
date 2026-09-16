import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';

// marked ships ESM-only; Jest's module loader (even for dynamic import()) can't parse
// its syntax without additional Babel tooling. Mock it with a trivial converter —
// these tests verify docsSite's own HTML assembly/escaping, not marked's rendering.
jest.mock('marked', () => ({
  marked: {
    parse: async (markdown: string) => markdown.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
  },
}));
import { createCollectionManager } from '../../src/bruno/collection.js';
import { createRequestBuilder } from '../../src/bruno/request.js';
import { writeFolderDocs, readFolderDocs } from '../../src/bruno/folder.js';
import { generateDocsSite } from '../../src/bruno/docsSite.js';

describe('folder docs (folder.bru)', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-folder-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('round-trips folder docs through folder.bru', async () => {
    const path = await writeFolderDocs(tmpRoot, 'Users', '# Users folder\n\nEndpoints for managing users.');
    expect(path).toBe(join(tmpRoot, 'folder.bru'));

    const docs = await readFolderDocs(tmpRoot);
    expect(docs).toBe('# Users folder\n\nEndpoints for managing users.');
  });

  test('readFolderDocs returns undefined when there is no folder.bru', async () => {
    const docs = await readFolderDocs(tmpRoot);
    expect(docs).toBeUndefined();
  });
});

describe('generateDocsSite', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-docssite-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('renders a self-contained HTML page with collection/folder/request docs, escaped', async () => {
    const collectionManager = createCollectionManager();
    const requestBuilder = createRequestBuilder();

    const { path: collectionPath } = await collectionManager.createCollection({
      name: 'Docs Demo',
      outputPath: tmpRoot
    });
    await collectionManager.updateCollection(collectionPath!, { docs: 'Collection overview <b>bold</b> & more' });

    await requestBuilder.createRequest({
      collectionPath: collectionPath!,
      name: 'Get <Widget> & More',
      method: 'GET',
      url: '{{baseUrl}}/widgets/{{id}}',
      folder: 'widgets',
      headers: { Accept: 'application/json' }
    });
    const requestPath = join(collectionPath!, 'widgets', 'get-widget-more.bru');
    await requestBuilder.setDocs(requestPath, 'Fetches a single **widget**.');
    await writeFolderDocs(join(collectionPath!, 'widgets'), 'widgets', 'Widget-related endpoints.');

    const outputPath = join(tmpRoot, 'docs.html');
    const result = await generateDocsSite(collectionManager, { collectionPath: collectionPath!, outputPath });

    expect(result.success).toBe(true);
    const html = await fs.readFile(outputPath, 'utf-8');

    expect(html).toContain('Docs Demo');
    expect(html).toContain('Collection overview'); // markdown-rendered, escaping is marked's job here
    expect(html).toContain('Get &lt;Widget&gt; &amp; More'); // raw request name must be HTML-escaped
    expect(html).toContain('GET');
    expect(html).toContain('{{baseUrl}}/widgets/{{id}}');
    expect(html).toContain('Fetches a single <strong>widget</strong>');
    expect(html).toContain('Accept');
    expect(html).toContain('application/json');
  });

  test('fails gracefully with a clear error for a missing collection', async () => {
    const collectionManager = createCollectionManager();
    const result = await generateDocsSite(collectionManager, {
      collectionPath: join(tmpRoot, 'does-not-exist'),
      outputPath: join(tmpRoot, 'out.html')
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
