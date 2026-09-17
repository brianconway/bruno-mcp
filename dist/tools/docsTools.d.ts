import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CollectionManager } from '../bruno/collection.js';
import { RequestBuilder } from '../bruno/request.js';
export interface DocsToolsDeps {
    collectionManager: CollectionManager;
    requestBuilder: RequestBuilder;
}
export declare function registerDocsTools(server: McpServer, deps: DocsToolsDeps): void;
//# sourceMappingURL=docsTools.d.ts.map