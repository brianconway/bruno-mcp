import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EnvironmentManager } from '../bruno/environment.js';
export interface EnvironmentToolsDeps {
    environmentManager: EnvironmentManager;
}
export declare function registerEnvironmentTools(server: McpServer, deps: EnvironmentToolsDeps): void;
//# sourceMappingURL=environmentTools.d.ts.map