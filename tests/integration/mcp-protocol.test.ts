/**
 * A minimal MCP-protocol-level test: connects a real Client to a real BrunoMcpServer
 * over an in-memory transport pair and exercises tools through actual JSON-RPC
 * tool-call/response round-trips. This is the one test that catches "the tool is
 * registered wrong" (bad zod schema, name typo, handler throws on the SDK's own
 * dispatch path) — the kind of bug that unit tests of the manager classes alone
 * wouldn't see, since those call the manager directly and never touch registerTool().
 */
import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createBrunoMcpServer } from '../../src/server.js';

describe('Bruno MCP server (in-memory protocol)', () => {
  let tmpRoot: string;
  let client: Client;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(join(os.tmpdir(), 'bruno-mcp-integration-'));

    const server = createBrunoMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  test('lists all expected tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual(
      [
        'add_test_script',
        'create_auth_requests',
        'create_collection',
        'create_crud_requests',
        'create_environment',
        'create_mock_server',
        'create_request',
        'create_test_suite',
        'generate_docs_site',
        'get_collection_stats',
        'get_request',
        'import_openapi',
        'list_collections',
        'list_mock_servers',
        'run_collection',
        'run_request',
        'set_docs',
        'start_mock_server',
        'stop_mock_server',
        'update_request',
      ].sort()
    );
  });

  test('create_collection -> create_request -> get_request round-trip over the wire', async () => {
    const createCollectionResult = await client.callTool({
      name: 'create_collection',
      arguments: { name: 'wire-test', outputPath: tmpRoot },
    });
    expect(createCollectionResult.isError).toBeFalsy();

    const collectionPath = join(tmpRoot, 'wire-test');

    const createRequestResult = await client.callTool({
      name: 'create_request',
      arguments: {
        collectionPath,
        name: 'Get Widget',
        method: 'GET',
        url: '{{baseUrl}}/widgets/{{id}}',
        headers: { Accept: 'application/json' },
      },
    });
    expect(createRequestResult.isError).toBeFalsy();

    const getRequestResult = await client.callTool({
      name: 'get_request',
      arguments: { bruFilePath: join(collectionPath, 'get-widget.bru') },
    });
    expect(getRequestResult.isError).toBeFalsy();
    const content = getRequestResult.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.http).toEqual({
      method: 'GET',
      url: '{{baseUrl}}/widgets/{{id}}',
      body: 'none',
      auth: 'none',
    });
    expect(parsed.headers).toEqual({ Accept: 'application/json' });
  });

  test('unknown tool name comes back as an error result', async () => {
    const result = await client.callTool({ name: 'not_a_real_tool', arguments: {} });
    expect(result.isError).toBe(true);
  });
});
