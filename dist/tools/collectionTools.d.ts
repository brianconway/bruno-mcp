import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CollectionManager } from '../bruno/collection.js';
export interface CollectionToolsDeps {
    collectionManager: CollectionManager;
}
export declare function registerCollectionTools(server: McpServer, deps: CollectionToolsDeps): void;
//# sourceMappingURL=collectionTools.d.ts.map