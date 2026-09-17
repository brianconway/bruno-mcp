import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestBuilder } from '../bruno/request.js';
export interface RequestToolsDeps {
    requestBuilder: RequestBuilder;
}
export declare function registerRequestTools(server: McpServer, deps: RequestToolsDeps): void;
//# sourceMappingURL=requestTools.d.ts.map