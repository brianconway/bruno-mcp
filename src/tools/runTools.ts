import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runCollection, RunResult } from '../bruno/runner.js';
import { importOpenApi } from '../bruno/importer.js';
import { ok, err, errorMessage } from './helpers.js';

function formatRunResult(targetPath: string, result: RunResult): string {
  if (!result.summary) {
    return `❌ Run of ${targetPath} did not produce a report: ${result.message ?? `exit code ${result.exitCode}`}`;
  }

  const { summary, requests } = result;
  const icon = result.success ? '✅' : '❌';
  const lines = [
    `${icon} bru run ${targetPath} — ${result.success ? 'PASS' : 'FAIL'}${result.message ? ` (${result.message})` : ''}`,
    `Requests: ${summary.passedRequests}/${summary.totalRequests} passed`,
    `Tests: ${summary.passedTests}/${summary.totalTests} passed`,
    `Assertions: ${summary.passedAssertions}/${summary.totalAssertions} passed`,
  ];

  const failed = (requests ?? []).filter((r) => r.status !== 'pass');
  if (failed.length > 0) {
    lines.push('', 'Failures:');
    for (const request of failed) {
      lines.push(`  - ${request.name} (${request.path})${request.responseStatus ? ` [HTTP ${request.responseStatus}]` : ''}`);
      if (request.error) lines.push(`      error: ${request.error}`);
      for (const test of request.failedTests) {
        lines.push(`      test failed: ${test.description}${test.error ? ` — ${test.error}` : ''}`);
      }
    }
  }

  return lines.join('\n');
}

export function registerRunTools(server: McpServer): void {
  const runOptionsSchema = {
    env: z.string().optional(),
    testsOnly: z.boolean().optional(),
    bail: z.boolean().optional(),
    tags: z.string().optional(),
    excludeTags: z.string().optional(),
    delayMs: z.number().optional()
  };

  server.registerTool(
    'run_request',
    {
      title: 'Run Bruno Request',
      description: 'Run a single .bru request file via the real Bruno CLI (bru) and return a pass/fail summary',
      inputSchema: {
        bruFilePath: z.string().min(1, 'BRU file path is required'),
        ...runOptionsSchema
      }
    },
    async (args) => {
      try {
        const { bruFilePath, ...options } = args;
        const result = await runCollection(bruFilePath, options);
        // A failing test run is informative output, not a tool-call error — only mark
        // isError when bru itself couldn't produce a report at all (e.g. not installed).
        return result.summary ? ok(formatRunResult(bruFilePath, result)) : err(formatRunResult(bruFilePath, result));
      } catch (error) {
        return err(`❌ Error running request: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'run_collection',
    {
      title: 'Run Bruno Collection',
      description: 'Run a whole collection or folder (recursively) via the real Bruno CLI (bru) and return a pass/fail summary',
      inputSchema: {
        collectionPath: z.string().min(1, 'Collection path is required'),
        recursive: z.boolean().optional().default(true),
        ...runOptionsSchema
      }
    },
    async (args) => {
      try {
        const { collectionPath, ...options } = args;
        const result = await runCollection(collectionPath, options);
        return result.summary ? ok(formatRunResult(collectionPath, result)) : err(formatRunResult(collectionPath, result));
      } catch (error) {
        return err(`❌ Error running collection: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'import_openapi',
    {
      title: 'Import OpenAPI Spec',
      description: 'Import an OpenAPI spec into a new Bruno collection (as plain .bru files) via the real Bruno CLI',
      inputSchema: {
        source: z.string().min(1, 'Source file path or URL is required'),
        outputDir: z.string().min(1, 'Output directory is required'),
        collectionName: z.string().optional(),
        groupBy: z.enum(['tags', 'path']).optional(),
        insecure: z.boolean().optional()
      }
    },
    async (args) => {
      try {
        const result = await importOpenApi(args);
        return result.success
          ? ok(`✅ ${result.message}${result.outputPath ? ` (at ${result.outputPath})` : ''}`)
          : err(`❌ Import failed: ${result.message}`);
      } catch (error) {
        return err(`❌ Error importing OpenAPI spec: ${errorMessage(error)}`);
      }
    }
  );
}
