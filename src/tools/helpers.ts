/**
 * Shared helpers for building MCP tool responses, so each tool handler doesn't
 * hand-roll the same `{ content: [...] }` shape.
 */

export interface ToolTextResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function ok(text: string): ToolTextResult {
  return { content: [{ type: 'text', text }] };
}

export function err(text: string): ToolTextResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
