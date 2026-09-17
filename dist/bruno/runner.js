/**
 * Wrapper around the real Bruno CLI (`bru`, from the globally-installed
 * @usebruno/cli package) for running requests/collections and importing OpenAPI
 * specs. This project doesn't reimplement request execution — it shells out to the
 * real thing and distills its JSON report into something compact enough to hand
 * back to an LLM caller (the raw reporter output includes every response header per
 * request, which would bloat a large collection's output unnecessarily).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
const execFileAsync = promisify(execFile);
/**
 * Check whether the `bru` CLI is on PATH. Callers should check this first and fail
 * fast with an actionable message rather than letting a raw ENOENT bubble up.
 *
 * `shell: true` is required on Windows: a globally npm-installed CLI is a `.cmd`
 * shim, and Windows' CreateProcess (what execFile uses without a shell) can only
 * launch real .exe files — only a shell can resolve and run a .cmd/.bat. Without
 * this, `bru` reports as "not found" even when `npm install -g @usebruno/cli`
 * worked and `bru` runs fine from an actual terminal.
 */
export async function checkBruAvailable() {
    try {
        const { stdout } = await execFileAsync('bru', ['--version'], { shell: true });
        return { available: true, version: stdout.trim() };
    }
    catch {
        return {
            available: false,
            message: 'Bruno CLI ("bru") was not found on PATH. Install it with: npm install -g @usebruno/cli',
        };
    }
}
const EXIT_CODE_MESSAGES = {
    0: 'Success',
    1: 'One or more tests, assertions, or requests failed',
    2: 'Output directory does not exist',
    3: 'Infinite request loop detected',
    4: 'Not in a collection root directory',
    5: 'Input file not found',
    6: 'Specified environment does not exist',
    255: 'Bruno CLI encountered an unexpected error',
};
function describeExitCode(code) {
    if (code >= 7 && code <= 9)
        return 'Environment override or output-format error';
    return EXIT_CODE_MESSAGES[code] ?? `Bruno CLI exited with unrecognized code ${code}`;
}
function mergeSummaries(iterations) {
    const totals = {
        totalRequests: 0,
        passedRequests: 0,
        failedRequests: 0,
        errorRequests: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalAssertions: 0,
        passedAssertions: 0,
        failedAssertions: 0,
    };
    for (const iteration of iterations) {
        for (const key of Object.keys(totals)) {
            totals[key] += iteration.summary?.[key] ?? 0;
        }
    }
    return totals;
}
function flattenRequests(iterations) {
    const requests = [];
    for (const iteration of iterations) {
        for (const result of iteration.results) {
            const failedTests = (result.testResults ?? [])
                .filter((t) => t.status !== 'pass')
                .map((t) => ({ description: t.description, error: t.error }));
            requests.push({
                name: result.name,
                path: result.path,
                status: result.status,
                responseStatus: result.response?.status,
                error: result.error ? String(result.error) : undefined,
                failedTests,
            });
        }
    }
    return requests;
}
async function runBru(args, cwd) {
    try {
        await execFileAsync('bru', args, { shell: true, cwd });
        return { exitCode: 0 };
    }
    catch (error) {
        const execError = error;
        return { exitCode: typeof execError.code === 'number' ? execError.code : 255 };
    }
}
/**
 * `bru run` resolves the collection relative to the process's current working
 * directory — it does not walk up from an absolute target path to find bruno.json
 * itself. So this finds the nearest ancestor directory containing a bruno.json,
 * which becomes the child process's cwd, and returns the target re-expressed
 * relative to that root (what `bru run` actually expects).
 */
function resolveCollectionRun(targetPath) {
    const absolute = resolve(targetPath);
    let dir;
    try {
        dir = statSync(absolute).isFile() ? dirname(absolute) : absolute;
    }
    catch {
        dir = dirname(absolute);
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (existsSync(join(dir, 'bruno.json'))) {
            const relativeTarget = relative(dir, absolute);
            return { cwd: dir, target: relativeTarget === '' ? undefined : relativeTarget };
        }
        const parent = dirname(dir);
        if (parent === dir) {
            return {};
        }
        dir = parent;
    }
}
/**
 * Run one or more requests/folders (or the whole collection) via `bru run`,
 * capturing results through `--reporter-json` (the CLI writes the report to a file,
 * not stdout, so this manages that temp-file's lifecycle).
 */
export async function runCollection(targetPath, options = {}) {
    // Check the cheap, synchronous, local thing (is there even a collection here?)
    // before spawning a process to check bru's availability.
    const { cwd, target } = resolveCollectionRun(targetPath);
    if (!cwd) {
        return {
            success: false,
            exitCode: 4,
            message: `Not in a collection root directory: no bruno.json found in any ancestor of ${targetPath}`,
        };
    }
    const availability = await checkBruAvailable();
    if (!availability.available) {
        return { success: false, exitCode: -1, message: availability.message };
    }
    const reportPath = join(os.tmpdir(), `bruno-mcp-report-${randomUUID()}.json`);
    const args = ['run'];
    if (target)
        args.push(target);
    args.push('--reporter-json', reportPath);
    if (options.recursive)
        args.push('-r');
    if (options.env)
        args.push('--env', options.env);
    if (options.testsOnly)
        args.push('--tests-only');
    if (options.bail)
        args.push('--bail');
    if (options.tags)
        args.push('--tags', options.tags);
    if (options.excludeTags)
        args.push('--exclude-tags', options.excludeTags);
    if (options.delayMs !== undefined)
        args.push('--delay', String(options.delayMs));
    const { exitCode } = await runBru(args, cwd);
    try {
        const raw = await fs.readFile(reportPath, 'utf-8');
        const iterations = JSON.parse(raw);
        return {
            success: exitCode === 0,
            exitCode,
            message: exitCode === 0 ? undefined : describeExitCode(exitCode),
            summary: mergeSummaries(iterations),
            requests: flattenRequests(iterations),
        };
    }
    catch {
        return {
            success: false,
            exitCode,
            message: exitCode === 0
                ? 'bru run reported success but produced no readable report file'
                : describeExitCode(exitCode),
        };
    }
    finally {
        await fs.rm(reportPath, { force: true });
    }
}
//# sourceMappingURL=runner.js.map