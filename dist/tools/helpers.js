/**
 * Shared helpers for building MCP tool responses, so each tool handler doesn't
 * hand-roll the same `{ content: [...] }` shape.
 */
export function ok(text) {
    return { content: [{ type: 'text', text }] };
}
export function err(text) {
    return { content: [{ type: 'text', text }], isError: true };
}
export function errorMessage(error) {
    return error instanceof Error ? error.message : 'Unknown error';
}
//# sourceMappingURL=helpers.js.map