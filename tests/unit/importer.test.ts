// execFile supports both `(file, args, callback)` and `(file, args, options, callback)`.
// importer.ts always passes options (for `shell: true`), so normalize to always call the
// mock with 4 args regardless of which form the real callsite used.
const execFileMock = jest.fn();
jest.mock('node:child_process', () => ({
  execFile: (...callArgs: unknown[]) => {
    const callback = callArgs[callArgs.length - 1];
    const options = callArgs.length > 3 ? callArgs[2] : undefined;
    return (execFileMock as (...a: unknown[]) => void)(callArgs[0], callArgs[1], options, callback);
  },
}));

import { importOpenApi } from '../../src/bruno/importer.js';

type ExecFileCallback = (error: (Error & { code?: number }) | null, result: { stdout: string; stderr: string }) => void;

describe('importOpenApi (bru import wrapper, execFile mocked)', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  test('pins --collection-format to bru so imported files stay readable by this toolset', async () => {
    execFileMock.mockImplementation((_file: string, args: string[], _options: unknown, callback: ExecFileCallback) => {
      if (args[0] === '--version') {
        callback(null, { stdout: '4.1.0', stderr: '' });
        return;
      }
      callback(null, { stdout: 'Imported successfully', stderr: '' });
    });

    const result = await importOpenApi({ source: 'api.yml', outputDir: '/tmp/out', collectionName: 'My API' });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/tmp/out');

    const runArgs = execFileMock.mock.calls.find((call) => call[1][0] === 'import')?.[1] as string[];
    expect(runArgs).toEqual(
      expect.arrayContaining(['--collection-format', 'bru', '--collection-name', 'My API', '--source', 'api.yml', '--output', '/tmp/out'])
    );
  });

  test('reports failure with stderr when the CLI exits non-zero', async () => {
    execFileMock.mockImplementation((_file: string, args: string[], _options: unknown, callback: ExecFileCallback) => {
      if (args[0] === '--version') {
        callback(null, { stdout: '4.1.0', stderr: '' });
        return;
      }
      callback(Object.assign(new Error('exit 5'), { code: 5, stderr: 'input file not found' }), { stdout: '', stderr: 'input file not found' });
    });

    const result = await importOpenApi({ source: 'missing.yml', outputDir: '/tmp/out' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/input file not found/);
  });

  test('fails fast with an actionable message when bru is unavailable', async () => {
    execFileMock.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
      callback(Object.assign(new Error('spawn bru ENOENT'), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });

    const result = await importOpenApi({ source: 'api.yml', outputDir: '/tmp/out' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/npm install -g @usebruno\/cli/);
  });
});
