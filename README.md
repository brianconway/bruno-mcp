# Bruno MCP Server

An MCP (Model Context Protocol) server for working with [Bruno](https://www.usebruno.com/) API collections entirely from Claude Code, Codex, or any other MCP client — create and edit requests, run them through the real Bruno CLI, generate API docs, and run mock servers, all without opening the Bruno desktop app or VS Code.

Forked from [macarthy/bruno-mcp](https://github.com/macarthy/bruno-mcp) (kept as the `upstream` git remote) and substantially extended: a real `.bru` parser (the original only read a request's name/method/url), real `bru` CLI integration for running and importing collections, a docs subsystem, and a mock-server subsystem — since Bruno's own docs-site generator and mock server are both desktop-GUI-only features with no CLI hook.

## Prerequisites

- **Node.js 18+** (developed against 24.x)
- **Bruno CLI**, installed globally, for the `run_*`/`import_openapi` tools:
  ```bash
  npm install -g @usebruno/cli
  ```
  Everything else works without it; only those three tools need `bru` on PATH.

## Setup

```bash
git clone <this-repo>
cd bruno-mcp
npm install
npm run build
```

`npm run build` uses `tsc --noCheck` — the TypeScript compiler's type-checker hits a known, unfixed, maintainer-acknowledged out-of-memory bug when checking any file that calls the MCP SDK's `registerTool` ([modelcontextprotocol/typescript-sdk#985](https://github.com/modelcontextprotocol/typescript-sdk/issues/985)), so the build skips type-checking and relies on `npm run typecheck` (needs a large `--max-old-space-size`) or your editor for that instead.

### Claude Code

```bash
claude mcp add bruno -- node /absolute/path/to/bruno-mcp/dist/index.js
```

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.bruno]
command = "node"
args = ["/absolute/path/to/bruno-mcp/dist/index.js"]
```

### Any other MCP client

```json
{
  "mcpServers": {
    "bruno": {
      "command": "node",
      "args": ["/absolute/path/to/bruno-mcp/dist/index.js"]
    }
  }
}
```

## Tools

**Collections & environments**
- `create_collection` — new Bruno collection (`bruno.json`, `environments/`, `.gitignore`, `README.md`)
- `list_collections` — recursively find collections (by `bruno.json`) under a directory
- `get_collection_stats` — request counts, folders, environments, per-method breakdown
- `create_environment` — environment variable file

**Requests**
- `create_request` — a single `.bru` request (any method, auth type, body type)
- `get_request` / `update_request` — read or partially update an existing request in place
- `create_crud_requests` — a standard Get-all/Get-by-id/Create/Update/Delete set for an entity
- `create_auth_requests` — a standard login/profile/refresh/logout set
- `create_test_suite` — several related requests with sequencing
- `add_test_script` — set a pre-request/post-response script or a tests block

**Running & importing** (need `bru` on PATH)
- `run_request` / `run_collection` — run via the real Bruno CLI, distilled pass/fail summary
- `import_openapi` — import an OpenAPI spec as plain `.bru` files (pinned to `--collection-format bru`, since Bruno's CLI defaults to a different format your other tools here can't read)

**Docs**
- `set_docs` — markdown docs at the collection (`bruno.json`), folder (`folder.bru`), or request level
- `generate_docs_site` — a single self-contained, searchable HTML docs page. Bruno's own doc-site generator is desktop-GUI-only; this is a scriptable (simpler, not pixel-identical) stand-in.

**Mock servers**
- `create_mock_server` — define canned routes (method, path with `:param`/`*` support, status, headers, body, delay) for a collection, saved to `.bruno-mcp/mocks/<name>.json`
- `start_mock_server` / `stop_mock_server` — run/stop it as a local HTTP server
- `list_mock_servers` — every mock server running on the machine right now, across all collections (registry lives in `~/.bruno-mcp/state`, not per-project)

Bruno's real mock server is also desktop-GUI-only beta with no CLI hook, so this is a separate, fully scriptable implementation — not the same on-disk format the desktop app's mock feature uses.

## Development

```bash
npm test          # jest — parser round-trips, real-filesystem tests, one full MCP-protocol test
npm run lint       # eslint
npm run typecheck  # tsc --noEmit (see the note above about why `build` skips this)
```

Tests transpile to CommonJS via `tsconfig.jest.json`/`jest.config.cjs` rather than running the project's real ESM build — this sidesteps both the SDK type-checking OOM and ts-jest's ESM friction. `marked` (used by `generate_docs_site`) ships ESM-only, so it's dynamically imported in source and mocked in tests rather than statically imported, which Jest's module loader can't parse either way without extra Babel tooling.

## Known limitations

- The `.bru` parser guarantees round-trip fidelity for this project's own generator output and canonical syntax — not byte-identical preservation of hand-edited comments or unusual formatting.
- `generate_docs_site` produces one self-contained HTML file, not a multi-page site.
- Mock server process tracking on Windows is "good enough" (PID-alive checks, log-tail on failure), not Job-Object-based process-tree cleanup.
