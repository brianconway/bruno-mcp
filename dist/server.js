/**
 * Bruno MCP Server
 * Composition root: wires the Bruno managers to their MCP tool registrations.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCollectionManager } from './bruno/collection.js';
import { createEnvironmentManager } from './bruno/environment.js';
import { createRequestBuilder } from './bruno/request.js';
import { registerCollectionTools } from './tools/collectionTools.js';
import { registerEnvironmentTools } from './tools/environmentTools.js';
import { registerRequestTools } from './tools/requestTools.js';
import { registerRunTools } from './tools/runTools.js';
import { registerDocsTools } from './tools/docsTools.js';
import { registerMockTools } from './tools/mockTools.js';
export class BrunoMcpServer {
    server;
    constructor(options = {}) {
        this.server = new McpServer({
            name: 'bruno-mcp',
            version: '1.0.0'
        });
        const collectionManager = createCollectionManager();
        const environmentManager = createEnvironmentManager();
        const requestBuilder = createRequestBuilder();
        registerCollectionTools(this.server, { collectionManager });
        registerEnvironmentTools(this.server, { environmentManager });
        registerRequestTools(this.server, { requestBuilder });
        registerRunTools(this.server);
        registerDocsTools(this.server, { collectionManager, requestBuilder });
        registerMockTools(this.server, { mockRuntimeScript: options.mockRuntimeScript ?? '' });
    }
    /**
     * Connect this server to an arbitrary transport (stdio in production, an
     * InMemoryTransport pair in tests).
     */
    async connect(transport) {
        await this.server.connect(transport);
    }
    /**
     * Start the MCP server over stdio
     */
    async start() {
        await this.connect(new StdioServerTransport());
        console.error('Bruno MCP Server started successfully! 🚀');
        console.error('Ready to generate Bruno API testing files.');
    }
}
/**
 * Create and export server instance
 */
export function createBrunoMcpServer(options) {
    return new BrunoMcpServer(options);
}
//# sourceMappingURL=server.js.map