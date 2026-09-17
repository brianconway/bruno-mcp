import { z } from 'zod';
import { ok, err, errorMessage } from './helpers.js';
export function registerEnvironmentTools(server, deps) {
    const { environmentManager } = deps;
    server.registerTool('create_environment', {
        title: 'Create Bruno Environment',
        description: 'Create environment configuration files for Bruno collection',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            name: z.string().min(1, 'Environment name is required'),
            variables: z.record(z.union([z.string(), z.number(), z.boolean()]))
        }
    }, async (args) => {
        try {
            const input = {
                collectionPath: args.collectionPath,
                name: args.name,
                variables: args.variables
            };
            const result = await environmentManager.createEnvironment(input);
            return result.success
                ? ok(`✅ Environment "${args.name}" created successfully at: ${result.path}`)
                : err(`❌ Failed to create environment: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error creating environment: ${errorMessage(error)}`);
        }
    });
}
//# sourceMappingURL=environmentTools.js.map