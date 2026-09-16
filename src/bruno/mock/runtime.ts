#!/usr/bin/env node
/**
 * Standalone mock server process, spawned (detached) by manager.ts. Not imported by
 * anything else — invoked directly as `node dist/bruno/mock/runtime.js --config
 * <path> --port <port>`. Deliberately plain `node:http`, no Express: routes are
 * static canned responses, not real routing logic.
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { matchRoute } from './router.js';
import { MockServerConfig } from './types.js';

function parseArgs(): { configPath: string; port: number } {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf('--config');
  const portIdx = args.indexOf('--port');
  const configPath = configIdx !== -1 ? args[configIdx + 1] : undefined;
  const portArg = portIdx !== -1 ? args[portIdx + 1] : undefined;

  if (!configPath || !portArg) {
    console.error('Usage: runtime.js --config <path> --port <port>');
    process.exit(1);
  }

  return { configPath, port: parseInt(portArg, 10) };
}

const { configPath, port } = parseArgs();
const config: MockServerConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const route = matchRoute(config.routes, req.method ?? 'GET', url.pathname);

  const respond = () => {
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No mock route matched', method: req.method, path: url.pathname }));
      console.log(`[bruno-mock] ${req.method} ${url.pathname} -> 404 (no match)`);
      return;
    }

    const contentType = route.bodyType === 'text' ? 'text/plain' : 'application/json';
    res.writeHead(route.status, { 'Content-Type': contentType, ...route.headers });
    res.end(route.body ?? '');
    console.log(`[bruno-mock] ${req.method} ${url.pathname} -> ${route.status}`);
  };

  if (route?.delayMs) {
    setTimeout(respond, route.delayMs);
  } else {
    respond();
  }
});

server.listen(port, () => {
  // start_mock_server polls the log for this exact line to confirm the server is up.
  console.log(`LISTENING on port ${port}`);
});

server.on('error', (error) => {
  console.error(`[bruno-mock] server error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
