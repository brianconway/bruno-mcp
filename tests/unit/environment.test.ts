import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { createCollectionManager } from '../../src/bruno/collection.js';
import { createEnvironmentManager } from '../../src/bruno/environment.js';

describe('EnvironmentManager', () => {
  let tmpRoot: string;
  let collectionPath: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-env-test-'));
    const collectionManager = createCollectionManager();
    const result = await collectionManager.createCollection({ name: 'env-test', outputPath: tmpRoot });
    collectionPath = result.path!;
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('generated environment file has no leading comment lines', async () => {
    // Regression test: the real Bruno CLI's environment parser rejects any content
    // before the first block ("Expected end of input" at line 1, col 1) — confirmed
    // against the actual `bru run --env <name>` command failing outright on a file
    // that opened with `# ...` header comments. The file must start with `vars {`.
    const environmentManager = createEnvironmentManager();
    await environmentManager.createEnvironment({
      collectionPath,
      name: 'default',
      variables: { baseUrl: 'https://api.example.com' },
    });

    const raw = await fs.readFile(join(collectionPath, 'environments', 'default.bru'), 'utf-8');
    expect(raw.startsWith('vars {')).toBe(true);
    expect(raw).not.toContain('#');
  });

  test('string variable values are written bare, not quoted', async () => {
    // Regression test: quoting a string variable's value (e.g. `baseUrl: '...'`)
    // makes real Bruno's {{baseUrl}} substitution include the literal quote
    // character — getaddrinfo ENOTFOUND 'https — confirmed against the actual CLI.
    const environmentManager = createEnvironmentManager();
    await environmentManager.createEnvironment({
      collectionPath,
      name: 'default',
      variables: { baseUrl: 'https://api.example.com' },
    });

    const raw = await fs.readFile(join(collectionPath, 'environments', 'default.bru'), 'utf-8');
    expect(raw).toContain('baseUrl: https://api.example.com');
    expect(raw).not.toContain("'");
  });

  test('round-trips variables through create -> load', async () => {
    const environmentManager = createEnvironmentManager();
    await environmentManager.createEnvironment({
      collectionPath,
      name: 'default',
      variables: { baseUrl: 'https://api.example.com', timeout: 3000, debug: true },
    });

    const loaded = await environmentManager.loadEnvironment(collectionPath, 'default');
    expect(loaded.variables).toEqual({ baseUrl: 'https://api.example.com', timeout: 3000, debug: true });
  });
});
