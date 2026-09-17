/**
 * Bruno MCP Server
 * Composition root: wires the Bruno managers to their MCP tool registrations.
 */
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
export interface BrunoMcpServerOptions {
    /**
     * Absolute path to the compiled dist/bruno/mock/runtime.js, needed by
     * start_mock_server to spawn the mock HTTP server process. Computed by index.ts
     * (via import.meta.url, safe there since Jest never imports index.ts) and passed
     * in — this class itself avoids import.meta so it stays safe to import from tests.
     */
    mockRuntimeScript?: string;
}
export declare class BrunoMcpServer {
    private server;
    constructor(options?: BrunoMcpServerOptions);
    /**
     * Connect this server to an arbitrary transport (stdio in production, an
     * InMemoryTransport pair in tests).
     */
    connect(transport: Transport): Promise<void>;
    /**
     * Start the MCP server over stdio
     */
    start(): Promise<void>;
}
/**
 * Create and export server instance
 */
export declare function createBrunoMcpServer(options?: BrunoMcpServerOptions): BrunoMcpServer;
//# sourceMappingURL=server.d.ts.map