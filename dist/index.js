#!/usr/bin/env node
/**
 * Bruno MCP Server Entry Point
 * Main entry point for the Bruno MCP server application
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createBrunoMcpServer } from './server.js';
// This file is the compiled dist/index.js, so its own directory is dist/ — the mock
// runtime script always sits at dist/bruno/mock/runtime.js relative to it. Computed
// here (not in server.ts) because this is the one file Jest never imports, so it's
// safe to use import.meta — see BrunoMcpServerOptions in server.ts for why.
const distDir = dirname(fileURLToPath(import.meta.url));
const mockRuntimeScript = join(distDir, 'bruno', 'mock', 'runtime.js');
async function main() {
    try {
        // Create and start the Bruno MCP server
        const server = createBrunoMcpServer({ mockRuntimeScript });
        await server.start();
        // Keep the process running
        process.on('SIGINT', () => {
            console.error('\nBruno MCP Server shutting down gracefully...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.error('\nBruno MCP Server shutting down gracefully...');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start Bruno MCP Server:', error);
        process.exit(1);
    }
}
// Start the server if this file is run directly.
// Comparing raw import.meta.url to a hand-built `file://${argv[1]}` string breaks on
// Windows (drive-letter and backslash formatting never matches) — normalize both to
// OS-native paths instead.
const isMainModule = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
    main().catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
export { createBrunoMcpServer } from './server.js';
export * from './bruno/types.js';
export * from './bruno/generator.js';
export { parseBruFile } from './bruno/parser.js';
export * from './bruno/collection.js';
export * from './bruno/environment.js';
export * from './bruno/request.js';
//# sourceMappingURL=index.js.map