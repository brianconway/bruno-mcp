/**
 * Wrapper around `bru import openapi`.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkBruAvailable } from './runner.js';

const execFileAsync = promisify(execFile);

export interface ImportOpenApiOptions {
  source: string;
  outputDir: string;
  collectionName?: string;
  groupBy?: 'tags' | 'path';
  insecure?: boolean;
}

export interface ImportResult {
  success: boolean;
  message: string;
  outputPath?: string;
}

export async function importOpenApi(options: ImportOpenApiOptions): Promise<ImportResult> {
  const availability = await checkBruAvailable();
  if (!availability.available) {
    return { success: false, message: availability.message ?? 'bru CLI not available' };
  }

  const args = [
    'import',
    'openapi',
    '--source',
    options.source,
    '--output',
    options.outputDir,
    // Bruno CLI defaults to the "opencollection" format; this project's tools read
    // and write plain .bru files, so the import must be pinned to that format to stay
    // usable by the rest of the toolset (create_request, get_request, run_*, etc).
    '--collection-format',
    'bru',
  ];
  if (options.collectionName) args.push('--collection-name', options.collectionName);
  if (options.groupBy) args.push('--group-by', options.groupBy);
  if (options.insecure) args.push('--insecure');

  try {
    // shell: true — see the comment on checkBruAvailable() in runner.ts: a globally
    // npm-installed CLI is a .cmd shim on Windows, which execFile can't launch
    // without a shell to interpret it.
    const { stdout } = await execFileAsync('bru', args, { shell: true });
    return {
      success: true,
      message: stdout.trim() || `Imported OpenAPI spec into ${options.outputDir}`,
      outputPath: options.outputDir,
    };
  } catch (error) {
    const execError = error as { stderr?: string; message?: string };
    return {
      success: false,
      message: execError.stderr?.trim() || execError.message || 'Import failed',
    };
  }
}
