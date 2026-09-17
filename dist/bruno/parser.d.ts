/**
 * BRU file parser — the real counterpart to generator.ts's BruGenerator.
 *
 * Scope: this is a faithful inverse of BruGenerator's own output (and canonically
 * formatted .bru files matching that same shape), not a general-purpose parser for
 * arbitrary hand-edited BRU syntax. It relies on one invariant BruGenerator always
 * upholds: every block's closing brace is emitted as a bare `}` at column 0, while
 * every content line inside a block is indented by at least `indentSize` spaces (see
 * BruGenerator.indent()). That means a block's end can be found by scanning for the
 * next line that is *exactly* `}` — no brace-depth counting needed — since any `}`
 * that's part of a block's own content (e.g. a closing brace inside an embedded JSON
 * body) is always indented and therefore never equal to the bare string `}`.
 */
import { BruFile } from './types.js';
export interface RawBlock {
    header: string;
    subtype?: string;
    lines: string[];
}
/**
 * Parse a complete .bru file's text into a BruFile object.
 */
export declare function parseBruFile(content: string): BruFile;
/**
 * Split raw file lines into top-level blocks. Lines outside any block (blank
 * separator lines, an optional leading timestamp comment) are ignored.
 *
 * Exported so other .bru-shaped-but-not-a-request files (e.g. folder.bru, which has
 * no http block) can reuse the same block-boundary scanning instead of duplicating
 * it — see folder.ts.
 */
export declare function splitTopLevelBlocks(rawLines: string[]): RawBlock[];
/**
 * Parse a `key: value` block's lines into an ordered map, mirroring the inverse of
 * escapeString()/formatValue(): a `'''...'''` value may span multiple lines, a
 * `'...'` value is single-line with no embedded quote (BruGenerator never emits one),
 * and anything else is a bare token (number/boolean/enum) left for the caller to
 * interpret.
 */
export declare function parseKeyValueBlock(rawLines: string[], indentSize?: number): Map<string, string | number | boolean>;
/**
 * Dedent block content and join it back into one string — the inverse of passing a
 * single multi-line string through indent() (used for body:json/text/xml and docs).
 */
export declare function parseBlobText(rawLines: string[], indentSize?: number): string;
//# sourceMappingURL=parser.d.ts.map