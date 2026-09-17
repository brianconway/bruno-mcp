/**
 * Shared helpers for building MCP tool responses, so each tool handler doesn't
 * hand-roll the same `{ content: [...] }` shape.
 */
export interface ToolTextResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}
export declare function ok(text: string): ToolTextResult;
export declare function err(text: string): ToolTextResult;
export declare function errorMessage(error: unknown): string;
//# sourceMappingURL=helpers.d.ts.map