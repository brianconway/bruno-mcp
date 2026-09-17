import { z } from 'zod';
import { ok, err, errorMessage } from './helpers.js';
const httpMethodEnum = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
const bodyTypeEnum = z.enum(['none', 'json', 'text', 'xml', 'form-data', 'form-urlencoded', 'binary']);
const authTypeEnum = z.enum(['none', 'bearer', 'basic', 'oauth2', 'api-key', 'digest']);
const bodySchema = z.object({
    type: bodyTypeEnum,
    content: z.string().optional(),
    formData: z
        .array(z.object({
        name: z.string(),
        value: z.string(),
        type: z.enum(['text', 'file']).optional()
    }))
        .optional()
});
const authSchema = z.object({
    type: authTypeEnum,
    config: z.record(z.string())
});
export function registerRequestTools(server, deps) {
    const { requestBuilder } = deps;
    server.registerTool('create_request', {
        title: 'Create Bruno Request',
        description: 'Generate .bru request files for API testing',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            name: z.string().min(1, 'Request name is required'),
            method: httpMethodEnum,
            url: z.string().min(1, 'URL is required'),
            headers: z.record(z.string()).optional(),
            body: bodySchema.optional(),
            auth: authSchema.optional(),
            query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
            folder: z.string().optional(),
            sequence: z.number().optional()
        }
    }, async (args) => {
        try {
            const input = {
                collectionPath: args.collectionPath,
                name: args.name,
                method: args.method,
                url: args.url,
                headers: args.headers,
                body: args.body
                    ? { type: args.body.type, content: args.body.content, formData: args.body.formData }
                    : undefined,
                auth: args.auth ? { type: args.auth.type, config: args.auth.config } : undefined,
                query: args.query,
                folder: args.folder,
                sequence: args.sequence
            };
            const result = await requestBuilder.createRequest(input);
            return result.success
                ? ok(`✅ Request "${args.name}" created successfully at: ${result.path}`)
                : err(`❌ Failed to create request: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error creating request: ${errorMessage(error)}`);
        }
    });
    server.registerTool('get_request', {
        title: 'Get Bruno Request',
        description: 'Read and fully parse an existing .bru request file (method, url, headers, query, body, auth, vars, scripts, tests, docs)',
        inputSchema: {
            bruFilePath: z.string().min(1, 'BRU file path is required')
        }
    }, async (args) => {
        try {
            const bruFile = await requestBuilder.loadRequest(args.bruFilePath);
            return ok(JSON.stringify(bruFile, null, 2));
        }
        catch (error) {
            return err(`❌ Error reading request: ${errorMessage(error)}`);
        }
    });
    server.registerTool('update_request', {
        title: 'Update Bruno Request',
        description: 'Update fields on an existing .bru request in place. Fields left unset are preserved.',
        inputSchema: {
            bruFilePath: z.string().min(1, 'BRU file path is required'),
            name: z.string().optional(),
            method: httpMethodEnum.optional(),
            url: z.string().optional(),
            headers: z.record(z.string()).optional(),
            body: bodySchema.optional(),
            auth: authSchema.optional()
        }
    }, async (args) => {
        try {
            const updates = {
                name: args.name,
                method: args.method,
                url: args.url,
                headers: args.headers,
                body: args.body
                    ? { type: args.body.type, content: args.body.content, formData: args.body.formData }
                    : undefined,
                auth: args.auth ? { type: args.auth.type, config: args.auth.config } : undefined
            };
            const result = await requestBuilder.updateRequest(args.bruFilePath, updates);
            return result.success
                ? ok(`✅ Request updated successfully at: ${result.path}`)
                : err(`❌ Failed to update request: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error updating request: ${errorMessage(error)}`);
        }
    });
    server.registerTool('add_test_script', {
        title: 'Add Test Script',
        description: 'Add or replace a pre-request/post-response script or tests block on an existing .bru request',
        inputSchema: {
            bruFilePath: z.string().min(1, 'BRU file path is required'),
            scriptType: z.enum(['pre-request', 'post-response', 'tests']),
            script: z.string().min(1, 'Script content is required')
        }
    }, async (args) => {
        try {
            const result = await requestBuilder.setScript(args.bruFilePath, args.scriptType, args.script);
            return result.success
                ? ok(`✅ ${args.scriptType} script written to ${result.path}`)
                : err(`❌ Failed to add test script: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error adding test script: ${errorMessage(error)}`);
        }
    });
    server.registerTool('create_test_suite', {
        title: 'Create Test Suite',
        description: 'Generate comprehensive test collections with multiple related requests',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            suiteName: z.string().min(1, 'Suite name is required'),
            requests: z.array(z.object({
                name: z.string(),
                method: httpMethodEnum,
                url: z.string(),
                headers: z.record(z.string()).optional(),
                body: z
                    .object({
                    type: z.enum(['none', 'json', 'text', 'xml', 'form-data', 'form-urlencoded']),
                    content: z.string().optional()
                })
                    .optional(),
                auth: authSchema.optional(),
                folder: z.string().optional()
            })),
            dependencies: z
                .array(z.object({
                from: z.string(),
                to: z.string(),
                variable: z.string()
            }))
                .optional()
        }
    }, async (args) => {
        try {
            const results = [];
            for (let i = 0; i < args.requests.length; i++) {
                const req = args.requests[i];
                const input = {
                    collectionPath: args.collectionPath,
                    name: req.name,
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    body: req.body ? { type: req.body.type, content: req.body.content } : undefined,
                    auth: req.auth ? { type: req.auth.type, config: req.auth.config } : undefined,
                    folder: req.folder || args.suiteName,
                    sequence: i + 1
                };
                results.push(await requestBuilder.createRequest(input));
            }
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.filter((r) => !r.success).length;
            return ok(`✅ Test suite "${args.suiteName}" created with ${successCount} requests${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        }
        catch (error) {
            return err(`❌ Error creating test suite: ${errorMessage(error)}`);
        }
    });
    server.registerTool('create_crud_requests', {
        title: 'Create CRUD Requests',
        description: 'Generate a complete set of CRUD operations for an entity',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            entityName: z.string().min(1, 'Entity name is required'),
            baseUrl: z.string().min(1, 'Base URL is required'),
            folder: z.string().optional()
        }
    }, async (args) => {
        try {
            const results = await requestBuilder.createCrudRequests(args.collectionPath, args.entityName, args.baseUrl, args.folder);
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.filter((r) => !r.success).length;
            return ok(`✅ CRUD operations for "${args.entityName}" created with ${successCount} requests${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        }
        catch (error) {
            return err(`❌ Error creating CRUD requests: ${errorMessage(error)}`);
        }
    });
    server.registerTool('create_auth_requests', {
        title: 'Create Auth Requests',
        description: 'Generate a standard login/get-profile/refresh/logout request set for an authentication flow',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            baseUrl: z.string().min(1, 'Base URL is required'),
            authType: authTypeEnum,
            folder: z.string().optional()
        }
    }, async (args) => {
        try {
            const results = await requestBuilder.createAuthRequests(args.collectionPath, args.baseUrl, args.authType, args.folder);
            const successCount = results.filter((r) => r.success).length;
            const failCount = results.filter((r) => !r.success).length;
            return ok(`✅ Auth requests created with ${successCount} requests${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        }
        catch (error) {
            return err(`❌ Error creating auth requests: ${errorMessage(error)}`);
        }
    });
}
//# sourceMappingURL=requestTools.js.map