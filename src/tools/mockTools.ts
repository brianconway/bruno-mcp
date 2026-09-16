import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockServer, startMockServer, stopMockServer, listMockServers } from '../bruno/mock/manager.js';
import { ok, err, errorMessage } from './helpers.js';

export interface MockToolsDeps {
  /** Absolute path to the compiled dist/bruno/mock/runtime.js — see manager.ts's comment on startMockServer. */
  mockRuntimeScript: string;
}

const mockRouteSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', '*']),
  path: z.string().min(1),
  status: z.number().int().min(100).max(599),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  bodyType: z.enum(['json', 'text']).optional(),
  delayMs: z.number().int().nonnegative().optional()
});

export function registerMockTools(server: McpServer, deps: MockToolsDeps): void {
  server.registerTool(
    'create_mock_server',
    {
      title: 'Create Mock Server Config',
      description:
        "Define a set of canned HTTP routes for a collection, persisted as a JSON config. Bruno's own mock server is a desktop-app-only beta feature with no CLI/scripting hook — this is a fully scriptable equivalent that doesn't need the GUI.",
      inputSchema: {
        collectionPath: z.string().min(1, 'Collection path is required'),
        name: z.string().min(1, 'Mock server name is required'),
        port: z.number().int().min(1).max(65535).optional(),
        routes: z.array(mockRouteSchema).min(1, 'At least one route is required')
      }
    },
    async (args) => {
      try {
        const result = await createMockServer(args);
        return result.success
          ? ok(`✅ Mock server config "${args.name}" saved at: ${result.configPath}`)
          : err(`❌ Failed to create mock server config: ${result.error}`);
      } catch (error) {
        return err(`❌ Error creating mock server config: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'start_mock_server',
    {
      title: 'Start Mock Server',
      description: 'Start a previously created mock server config as a local HTTP server (spawned as a detached process)',
      inputSchema: {
        collectionPath: z.string().min(1, 'Collection path is required'),
        name: z.string().min(1, 'Mock server name is required'),
        port: z.number().int().min(1).max(65535).optional()
      }
    },
    async (args) => {
      try {
        const result = await startMockServer(args, deps.mockRuntimeScript);
        return result.success
          ? ok(`✅ Mock server "${args.name}" running at ${result.url}`)
          : err(`❌ Failed to start mock server: ${result.error}`);
      } catch (error) {
        return err(`❌ Error starting mock server: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'stop_mock_server',
    {
      title: 'Stop Mock Server',
      description: 'Stop a running mock server by name',
      inputSchema: { name: z.string().min(1, 'Mock server name is required') }
    },
    async (args) => {
      try {
        const result = await stopMockServer(args.name);
        return result.success ? ok(`✅ Mock server "${args.name}" stopped`) : err(`❌ Failed to stop mock server: ${result.error}`);
      } catch (error) {
        return err(`❌ Error stopping mock server: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'list_mock_servers',
    {
      title: 'List Mock Servers',
      description: 'List every mock server currently running on this machine, across all collections/projects',
      inputSchema: {}
    },
    async () => {
      try {
        const servers = await listMockServers();
        if (servers.length === 0) {
          return ok('No mock servers currently running.');
        }
        const listing = servers
          .map((s) => `  - ${s.name}: http://localhost:${s.port} (pid ${s.pid}, collection: ${s.collectionPath ?? 'unknown'})`)
          .join('\n');
        return ok(`Running mock servers:\n${listing}`);
      } catch (error) {
        return err(`❌ Error listing mock servers: ${errorMessage(error)}`);
      }
    }
  );
}
