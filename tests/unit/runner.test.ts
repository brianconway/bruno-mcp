import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';

// execFile supports both `(file, args, callback)` and `(file, args, options, callback)`.
// runner.ts always passes options (for `shell: true`), so normalize to always call the
// mock with 4 args regardless of which form the real callsite used.
const execFileMock = jest.fn();
jest.mock('node:child_process', () => ({
  execFile: (...callArgs: unknown[]) => {
    const callback = callArgs[callArgs.length - 1];
    const options = callArgs.length > 3 ? callArgs[2] : undefined;
    return (execFileMock as (...a: unknown[]) => void)(callArgs[0], callArgs[1], options, callback);
  },
}));

import { checkBruAvailable, runCollection } from '../../src/bruno/runner.js';

type ExecFileCallback = (error: (Error & { code?: number }) | null, result: { stdout: string; stderr: string }) => void;

function mockRun(handler: (file: string, args: string[]) => (Error & { code?: number }) | null) {
  execFileMock.mockImplementation((file: string, args: string[], _options: unknown, callback: ExecFileCallback) => {
    const error = handler(file, args);
    callback(error, { stdout: '', stderr: error ? 'boom' : '' });
  });
}

async function writeReportFor(args: string[], report: unknown) {
  const idx = args.indexOf('--reporter-json');
  if (idx === -1) return;
  await fs.writeFile(args[idx + 1], JSON.stringify(report), 'utf-8');
}

const passingSummary = {
  totalRequests: 1,
  passedRequests: 1,
  failedRequests: 0,
  errorRequests: 0,
  totalTests: 1,
  passedTests: 1,
  failedTests: 0,
  totalAssertions: 0,
  passedAssertions: 0,
  failedAssertions: 0,
};

const failingSummary = {
  ...passingSummary,
  passedRequests: 0,
  failedRequests: 1,
  passedTests: 0,
  failedTests: 1,
};

describe('runner (bru CLI wrapper, execFile mocked)', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  test('checkBruAvailable reports unavailable when bru is not on PATH', async () => {
    mockRun(() => Object.assign(new Error('spawn bru ENOENT'), { code: 'ENOENT' }));
    const result = await checkBruAvailable();
    expect(result.available).toBe(false);
    expect(result.message).toMatch(/npm install -g @usebruno\/cli/);
  });

  test('checkBruAvailable reports available with a version string', async () => {
    execFileMock.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
      callback(null, { stdout: '4.1.0\n', stderr: '' });
    });
    const result = await checkBruAvailable();
    expect(result).toEqual({ available: true, version: '4.1.0' });
  });

  test('runCollection fails fast with no execFile call when no bruno.json is found', async () => {
    const result = await runCollection(join(os.tmpdir(), 'definitely-not-a-collection-' + Date.now()));
    expect(result.success).toBe(false);
    expect(result.summary).toBeUndefined();
    expect(result.message).toMatch(/Not in a collection root directory/);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  describe('against a real temp collection (so cwd resolution finds bruno.json)', () => {
    let collectionPath: string;
    let requestPath: string;

    beforeEach(async () => {
      collectionPath = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-runner-test-'));
      await fs.writeFile(join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'test', type: 'collection' }));
      requestPath = join(collectionPath, 'get-post.bru');
      await fs.writeFile(requestPath, 'meta {\n  name: Get Post\n  type: http\n}\n\nget {\n  url: https://example.com\n  body: none\n  auth: none\n}\n');
    });

    afterEach(async () => {
      await fs.rm(collectionPath, { recursive: true, force: true });
    });

    test('returns success:false with no summary when bru is unavailable', async () => {
      mockRun(() => Object.assign(new Error('spawn bru ENOENT'), { code: 'ENOENT' }));
      const result = await runCollection(requestPath);
      expect(result.success).toBe(false);
      expect(result.summary).toBeUndefined();
      expect(result.exitCode).toBe(-1);
    });

    test('runs with cwd set to the collection root and a path relative to it', async () => {
      execFileMock.mockImplementation(async (_file: string, args: string[], options: { cwd?: string }, callback: ExecFileCallback) => {
        if (args[0] === '--version') {
          callback(null, { stdout: '4.1.0', stderr: '' });
          return;
        }
        expect(options?.cwd).toBe(collectionPath);
        expect(args).toContain('get-post.bru');
        await writeReportFor(args, [{ results: [{ name: 'Get Post', path: 'get-post', status: 'pass', response: { status: 200, statusText: 'OK' }, error: null, testResults: [] }], summary: passingSummary }]);
        callback(null, { stdout: '', stderr: '' });
      });

      const result = await runCollection(requestPath);
      expect(result.success).toBe(true);
      expect(result.summary?.passedRequests).toBe(1);
      expect(result.requests?.[0]).toMatchObject({ name: 'Get Post', status: 'pass', responseStatus: 200 });
    });

    test('surfaces failed tests and maps exit code 1 to a message', async () => {
      execFileMock.mockImplementation(async (_file: string, args: string[], _options: unknown, callback: ExecFileCallback) => {
        if (args[0] === '--version') {
          callback(null, { stdout: '4.1.0', stderr: '' });
          return;
        }
        await writeReportFor(args, [
          {
            results: [
              {
                name: 'Get Post',
                path: 'get-post',
                status: 'fail',
                response: { status: 500, statusText: 'Internal Server Error' },
                error: null,
                testResults: [{ description: 'status is 200', status: 'fail', error: 'expected 500 to equal 200' }],
              },
            ],
            summary: failingSummary,
          },
        ]);
        callback(Object.assign(new Error('exit 1'), { code: 1 }), { stdout: '', stderr: '' });
      });

      const result = await runCollection(requestPath);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/tests, assertions, or requests failed/);
      expect(result.requests?.[0].failedTests).toEqual([
        { description: 'status is 200', error: 'expected 500 to equal 200' },
      ]);
    });

    test('cleans up the temp report file after reading it', async () => {
      let capturedPath = '';
      execFileMock.mockImplementation(async (_file: string, args: string[], _options: unknown, callback: ExecFileCallback) => {
        if (args[0] === '--version') {
          callback(null, { stdout: '4.1.0', stderr: '' });
          return;
        }
        const idx = args.indexOf('--reporter-json');
        capturedPath = args[idx + 1];
        await writeReportFor(args, [{ results: [], summary: { ...passingSummary, totalRequests: 0, passedRequests: 0, totalTests: 0, passedTests: 0 } }]);
        callback(null, { stdout: '', stderr: '' });
      });

      await runCollection(requestPath);
      await expect(fs.access(capturedPath)).rejects.toThrow();
    });
  });
});
