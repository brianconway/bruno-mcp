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

import {
  BruFile,
  BruMeta,
  BruHttpRequest,
  BruAuth,
  BruHeaders,
  BruQuery,
  BruVars,
  BruBody,
  BruTests,
  HttpMethod,
  AuthType,
  BodyType,
  BruFileError,
} from './types.js';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const BLOCK_HEADER_RE = /^([a-zA-Z][a-zA-Z0-9_-]*)(?::([a-zA-Z][a-zA-Z0-9_-]*))?\s*\{$/;
const DEFAULT_INDENT_SIZE = 2;

export interface RawBlock {
  header: string;
  subtype?: string;
  lines: string[];
}

/**
 * Parse a complete .bru file's text into a BruFile object.
 */
export function parseBruFile(content: string): BruFile {
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks = splitTopLevelBlocks(rawLines);

  let meta: BruMeta | undefined;
  let http: BruHttpRequest | undefined;
  let auth: BruAuth | undefined;
  let headers: BruHeaders | undefined;
  let query: BruQuery | undefined;
  let body: BruBody | undefined;
  let vars: BruVars | undefined;
  let script: BruFile['script'];
  let tests: BruTests | undefined;
  let docs: string | undefined;

  for (const block of blocks) {
    const { header, subtype, lines } = block;

    if (header === 'meta') {
      meta = parseMetaBlock(lines);
    } else if (HTTP_METHODS.has(header)) {
      http = parseHttpBlock(header, lines);
    } else if (header === 'auth' && subtype) {
      auth = parseAuthBlock(subtype, lines);
    } else if (header === 'headers') {
      headers = parseStringMap(lines);
    } else if (header === 'query') {
      query = mapToRecord(parseKeyValueBlock(lines));
    } else if (header === 'vars') {
      vars = mapToRecord(parseKeyValueBlock(lines));
    } else if (header === 'body' && subtype) {
      body = parseBodyBlock(subtype, lines);
    } else if (header === 'script' && subtype === 'pre-request') {
      script = script ?? {};
      script['pre-request'] = { exec: parseBlobLines(lines) };
    } else if (header === 'script' && subtype === 'post-response') {
      script = script ?? {};
      script['post-response'] = { exec: parseBlobLines(lines) };
    } else if (header === 'tests') {
      tests = { exec: parseBlobLines(lines) };
    } else if (header === 'docs') {
      docs = parseBlobText(lines);
    }
    // Unrecognized block types are skipped rather than rejected, so parsing tolerates
    // additions this parser doesn't know about yet.
  }

  if (!meta) {
    throw new BruFileError('Missing required "meta" block');
  }
  if (!http) {
    throw new BruFileError('Missing required HTTP method block (get/post/put/delete/patch/head/options)');
  }

  return { meta, http, auth, headers, query, body, vars, script, tests, docs };
}

/**
 * Split raw file lines into top-level blocks. Lines outside any block (blank
 * separator lines, an optional leading timestamp comment) are ignored.
 *
 * Exported so other .bru-shaped-but-not-a-request files (e.g. folder.bru, which has
 * no http block) can reuse the same block-boundary scanning instead of duplicating
 * it — see folder.ts.
 */
export function splitTopLevelBlocks(rawLines: string[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const match = rawLines[i].match(BLOCK_HEADER_RE);
    if (!match) {
      i++;
      continue;
    }

    const header = match[1];
    const subtype = match[2];
    const contentLines: string[] = [];
    let j = i + 1;
    while (j < rawLines.length && rawLines[j] !== '}') {
      contentLines.push(rawLines[j]);
      j++;
    }

    if (j >= rawLines.length) {
      throw new BruFileError(`Unterminated "${header}" block starting at line ${i + 1}`);
    }

    blocks.push({ header, subtype, lines: contentLines });
    i = j + 1;
  }

  return blocks;
}

/**
 * Strip one level of BruGenerator's indent() from a single line. Blank/whitespace-only
 * lines are returned unchanged, matching indent()'s own choice not to touch them.
 */
function dedentLine(line: string, indentSize: number = DEFAULT_INDENT_SIZE): string {
  if (line.trim() === '') {
    return line;
  }
  if (line.startsWith('\t')) {
    return line.slice(1);
  }
  let n = 0;
  while (n < indentSize && line[n] === ' ') {
    n++;
  }
  return line.slice(n);
}

/**
 * Parse a `key: value` block's lines into an ordered map, mirroring the inverse of
 * escapeString()/formatValue(): a `'''...'''` value may span multiple lines, a
 * `'...'` value is single-line with no embedded quote (BruGenerator never emits one),
 * and anything else is a bare token (number/boolean/enum) left for the caller to
 * interpret.
 */
export function parseKeyValueBlock(rawLines: string[], indentSize: number = DEFAULT_INDENT_SIZE): Map<string, string | number | boolean> {
  const result = new Map<string, string | number | boolean>();
  const lines = rawLines.map((l) => dedentLine(l, indentSize));
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).replace(/^ /, '');

    if (rest.startsWith("'''")) {
      const afterOpen = rest.slice(3);
      const closeOnSameLine = afterOpen.indexOf("'''");
      if (closeOnSameLine !== -1) {
        result.set(key, afterOpen.slice(0, closeOnSameLine));
        i++;
        continue;
      }

      const valueLines = [afterOpen];
      i++;
      while (i < lines.length && !lines[i].includes("'''")) {
        valueLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        const closingIdx = lines[i].indexOf("'''");
        valueLines.push(lines[i].slice(0, closingIdx));
        i++;
      }
      result.set(key, valueLines.join('\n'));
      continue;
    }

    if (rest.startsWith("'")) {
      const closingIdx = rest.lastIndexOf("'");
      result.set(key, closingIdx > 0 ? rest.slice(1, closingIdx) : '');
      i++;
      continue;
    }

    result.set(key, parseScalarValue(rest));
    i++;
  }

  return result;
}

function parseScalarValue(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && /^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function mapToRecord(map: Map<string, string | number | boolean>): Record<string, string | number | boolean> {
  return Object.fromEntries(map);
}

function parseStringMap(rawLines: string[]): Record<string, string> {
  const map = parseKeyValueBlock(rawLines);
  const result: Record<string, string> = {};
  for (const [key, value] of map) {
    result[key] = typeof value === 'string' ? value : String(value);
  }
  return result;
}

/**
 * Dedent block content and join it back into one string — the inverse of passing a
 * single multi-line string through indent() (used for body:json/text/xml and docs).
 */
export function parseBlobText(rawLines: string[], indentSize: number = DEFAULT_INDENT_SIZE): string {
  return rawLines.map((l) => dedentLine(l, indentSize)).join('\n');
}

/**
 * Dedent block content into an array of lines — the inverse of indenting each element
 * of a `string[]` individually (used for script:pre-request/post-response and tests).
 */
function parseBlobLines(rawLines: string[], indentSize: number = DEFAULT_INDENT_SIZE): string[] {
  return rawLines.map((l) => dedentLine(l, indentSize));
}

function parseMetaBlock(lines: string[]): BruMeta {
  const map = parseKeyValueBlock(lines);
  const name = map.get('name');
  const type = map.get('type');
  const seq = map.get('seq');
  return {
    name: typeof name === 'string' ? name : String(name ?? ''),
    type: type === 'graphql' ? 'graphql' : 'http',
    seq: typeof seq === 'number' ? seq : undefined,
  };
}

function parseHttpBlock(methodWord: string, lines: string[]): BruHttpRequest {
  const map = parseKeyValueBlock(lines);
  const url = map.get('url');
  const bodyToken = map.get('body');
  const authToken = map.get('auth');
  return {
    method: methodWord.toUpperCase() as HttpMethod,
    url: typeof url === 'string' ? url : '',
    body: (typeof bodyToken === 'string' ? bodyToken : 'none') as BodyType,
    auth: (typeof authToken === 'string' ? authToken : 'none') as AuthType,
  };
}

function asString(map: Map<string, string | number | boolean>, key: string): string | undefined {
  const value = map.get(key);
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

function asGrantType(value: string | undefined): 'authorization_code' | 'client_credentials' | 'password' {
  return value === 'authorization_code' || value === 'password' ? value : 'client_credentials';
}

function asApiKeyIn(value: string | undefined): 'header' | 'query' {
  return value === 'query' ? 'query' : 'header';
}

function parseAuthBlock(subtype: string, lines: string[]): BruAuth {
  const map = parseKeyValueBlock(lines);
  const auth: BruAuth = { type: subtype as AuthType };

  switch (subtype) {
    case 'bearer':
      auth.bearer = { token: asString(map, 'token') ?? '' };
      break;
    case 'basic':
      auth.basic = {
        username: asString(map, 'username') ?? '',
        password: asString(map, 'password') ?? '',
      };
      break;
    case 'oauth2':
      auth.oauth2 = {
        grantType: asGrantType(asString(map, 'grant_type')),
        accessTokenUrl: asString(map, 'access_token_url'),
        authorizationUrl: asString(map, 'authorization_url'),
        clientId: asString(map, 'client_id'),
        clientSecret: asString(map, 'client_secret'),
        scope: asString(map, 'scope'),
        username: asString(map, 'username'),
        password: asString(map, 'password'),
      };
      break;
    case 'api-key':
      auth.apikey = {
        key: asString(map, 'key') ?? '',
        value: asString(map, 'value') ?? '',
        in: asApiKeyIn(asString(map, 'in')),
      };
      break;
    case 'digest':
      auth.digest = {
        username: asString(map, 'username') ?? '',
        password: asString(map, 'password') ?? '',
      };
      break;
  }

  return auth;
}

function parseBodyBlock(subtype: string, lines: string[]): BruBody {
  if (subtype === 'json' || subtype === 'text' || subtype === 'xml') {
    return { type: subtype, content: parseBlobText(lines) };
  }

  if (subtype === 'multipart-form') {
    const map = parseKeyValueBlock(lines);
    return {
      type: 'form-data',
      formData: Array.from(map.entries()).map(([name, value]) => ({
        name,
        value: String(value),
        type: 'text' as const,
      })),
    };
  }

  if (subtype === 'form-urlencoded') {
    const map = parseKeyValueBlock(lines);
    return {
      type: 'form-urlencoded',
      formUrlEncoded: Array.from(map.entries()).map(([name, value]) => ({
        name,
        value: String(value),
      })),
    };
  }

  return { type: 'none' };
}
