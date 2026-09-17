import { MockRoute } from './types.js';
export interface CreateMockServerParams {
    collectionPath: string;
    name: string;
    routes: MockRoute[];
    port?: number;
}
export declare function createMockServer(params: CreateMockServerParams): Promise<{
    success: boolean;
    configPath?: string;
    error?: string;
}>;
export interface StartMockServerParams {
    collectionPath: string;
    name: string;
    port?: number;
}
/**
 * `runtimeScriptPath` (the compiled dist/bruno/mock/runtime.js) is injected by the
 * caller rather than self-located via import.meta.url here, so this module stays
 * free of syntax TypeScript rejects under a CommonJS module target — which matters
 * because this file is transitively pulled into the Jest test run (via server.ts)
 * the moment mock tools are registered, and tests transpile everything to CommonJS.
 * The real value is computed once in index.ts, the one file Jest never imports.
 */
export declare function startMockServer(params: StartMockServerParams, runtimeScriptPath: string): Promise<{
    success: boolean;
    port?: number;
    url?: string;
    error?: string;
}>;
export declare function stopMockServer(name: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function listMockServers(): Promise<import("./types.js").MockServerInstance[]>;
//# sourceMappingURL=manager.d.ts.map