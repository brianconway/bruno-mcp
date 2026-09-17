/**
 * Wrapper around the real Bruno CLI (`bru`, from the globally-installed
 * @usebruno/cli package) for running requests/collections and importing OpenAPI
 * specs. This project doesn't reimplement request execution — it shells out to the
 * real thing and distills its JSON report into something compact enough to hand
 * back to an LLM caller (the raw reporter output includes every response header per
 * request, which would bloat a large collection's output unnecessarily).
 */
export interface BruCliAvailability {
    available: boolean;
    version?: string;
    message?: string;
}
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
export declare function checkBruAvailable(): Promise<BruCliAvailability>;
export interface RunOptions {
    env?: string;
    recursive?: boolean;
    testsOnly?: boolean;
    bail?: boolean;
    tags?: string;
    excludeTags?: string;
    delayMs?: number;
}
interface BruReportSummary {
    totalRequests: number;
    passedRequests: number;
    failedRequests: number;
    errorRequests: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
}
export interface RunRequestSummary {
    name: string;
    path: string;
    status: string;
    responseStatus?: number;
    error?: string;
    failedTests: Array<{
        description: string;
        error?: string;
    }>;
}
export interface RunResult {
    success: boolean;
    exitCode: number;
    message?: string;
    summary?: BruReportSummary;
    requests?: RunRequestSummary[];
}
/**
 * Run one or more requests/folders (or the whole collection) via `bru run`,
 * capturing results through `--reporter-json` (the CLI writes the report to a file,
 * not stdout, so this manages that temp-file's lifecycle).
 */
export declare function runCollection(targetPath: string, options?: RunOptions): Promise<RunResult>;
export {};
//# sourceMappingURL=runner.d.ts.map