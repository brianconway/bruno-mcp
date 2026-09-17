/**
 * Global registry of currently-running mock server processes, tracked in
 * ~/.bruno-mcp/state (not per-project), so `list_mock_servers` can show everything
 * running across every collection on the machine. Overridable via
 * BRUNO_MCP_STATE_DIR (used by tests to avoid touching the real home directory).
 */
import { MockServerInstance } from './types.js';
export declare function logDir(): string;
export declare function listServers(): Promise<MockServerInstance[]>;
export declare function addServer(instance: MockServerInstance): Promise<void>;
export declare function removeServer(name: string): Promise<MockServerInstance | undefined>;
//# sourceMappingURL=state.d.ts.map