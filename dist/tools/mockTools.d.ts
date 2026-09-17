import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface MockToolsDeps {
    /** Absolute path to the compiled dist/bruno/mock/runtime.js — see manager.ts's comment on startMockServer. */
    mockRuntimeScript: string;
}
export declare function registerMockTools(server: McpServer, deps: MockToolsDeps): void;
//# sourceMappingURL=mockTools.d.ts.map