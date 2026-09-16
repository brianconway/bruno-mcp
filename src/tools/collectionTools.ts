import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CollectionManager } from '../bruno/collection.js';
import { CreateCollectionInput } from '../bruno/types.js';
import { ok, err, errorMessage } from './helpers.js';

export interface CollectionToolsDeps {
  collectionManager: CollectionManager;
}

export function registerCollectionTools(server: McpServer, deps: CollectionToolsDeps): void {
  const { collectionManager } = deps;

  server.registerTool(
    'create_collection',
    {
      title: 'Create Bruno Collection',
      description: 'Create a new Bruno API testing collection with configuration',
      inputSchema: {
        name: z.string().min(1, 'Collection name is required'),
        description: z.string().optional(),
        baseUrl: z.string().url().optional(),
        outputPath: z.string().min(1, 'Output path is required'),
        ignore: z.array(z.string()).optional()
      }
    },
    async (args) => {
      try {
        const input: CreateCollectionInput = {
          name: args.name,
          description: args.description,
          baseUrl: args.baseUrl,
          outputPath: args.outputPath,
          ignore: args.ignore
        };

        const result = await collectionManager.createCollection(input);
        return result.success
          ? ok(`✅ Bruno collection "${args.name}" created successfully at: ${result.path}`)
          : err(`❌ Failed to create collection: ${result.error}`);
      } catch (error) {
        return err(`❌ Error creating collection: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'list_collections',
    {
      title: 'List Collections',
      description: 'Recursively find all Bruno collections (directories containing a bruno.json) under a directory',
      inputSchema: {
        path: z.string().min(1, 'Directory path is required')
      }
    },
    async (args) => {
      try {
        const collections = await collectionManager.listCollections(args.path);
        if (collections.length === 0) {
          return ok(`📁 No Bruno collections found under: ${args.path}`);
        }
        const listing = collections.map((c) => `  - ${c.name} (${c.path})`).join('\n');
        return ok(`📁 Found ${collections.length} collection(s) under ${args.path}:\n${listing}`);
      } catch (error) {
        return err(`❌ Error listing collections: ${errorMessage(error)}`);
      }
    }
  );

  server.registerTool(
    'get_collection_stats',
    {
      title: 'Get Collection Statistics',
      description: 'Get detailed statistics about a Bruno collection',
      inputSchema: {
        collectionPath: z.string().min(1, 'Collection path is required')
      }
    },
    async (args) => {
      try {
        const stats = await collectionManager.getCollectionStats(args.collectionPath);
        const methodBreakdown = Object.entries(stats.requestsByMethod)
          .map(([method, count]) => `  ${method}: ${count}`)
          .join('\n') || '  (no parseable requests found)';

        return ok(`📊 Collection Statistics for ${args.collectionPath}:

📁 Total Requests: ${stats.totalRequests}
📂 Folders: ${stats.folders.length > 0 ? stats.folders.join(', ') : 'None'}
🌍 Environments: ${stats.environments.length > 0 ? stats.environments.join(', ') : 'None'}

Request Methods:
${methodBreakdown}
`);
      } catch (error) {
        return err(`❌ Error getting collection stats: ${errorMessage(error)}`);
      }
    }
  );
}
