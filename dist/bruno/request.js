/**
 * Bruno request builder
 * Handles creation and management of .bru request files
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BrunoError, BruFileError } from './types.js';
import { generateBruFile } from './generator.js';
import { parseBruFile } from './parser.js';
export class RequestBuilder {
    /**
     * Create a new .bru request file
     */
    async createRequest(input) {
        try {
            // Validate input
            this.validateRequestInput(input);
            // Build BRU file structure
            const bruFile = this.buildBruFile(input);
            // Determine file path
            const filePath = this.getRequestFilePath(input);
            // Ensure directory exists
            await this.ensureDirectory(dirname(filePath));
            // Generate and write BRU file
            const bruContent = generateBruFile(bruFile);
            await fs.writeFile(filePath, bruContent);
            return {
                success: true,
                path: filePath
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Load an existing .bru request file
     */
    async loadRequest(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return parseBruFile(content);
        }
        catch (error) {
            throw new BruFileError(`Failed to load request from ${filePath}`, { originalError: error });
        }
    }
    /**
     * Update an existing request
     */
    async updateRequest(filePath, updates) {
        try {
            // Load existing request
            const existingBru = await this.loadRequest(filePath);
            // Apply updates
            const updatedBru = this.applyUpdates(existingBru, updates);
            // Generate and write updated content
            const bruContent = generateBruFile(updatedBru);
            await fs.writeFile(filePath, bruContent);
            return {
                success: true,
                path: filePath
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create multiple related requests (CRUD operations)
     */
    async createCrudRequests(collectionPath, entityName, baseUrl, folder) {
        const results = [];
        const crudOperations = [
            {
                name: `Get All ${entityName}`,
                method: 'GET',
                url: `${baseUrl}/${entityName.toLowerCase()}`,
                sequence: 1
            },
            {
                name: `Get ${entityName} by ID`,
                method: 'GET',
                url: `${baseUrl}/${entityName.toLowerCase()}/{{id}}`,
                sequence: 2
            },
            {
                name: `Create ${entityName}`,
                method: 'POST',
                url: `${baseUrl}/${entityName.toLowerCase()}`,
                body: {
                    type: 'json',
                    content: JSON.stringify({
                        name: `New ${entityName}`,
                        description: `Description for ${entityName}`
                    }, null, 2)
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                sequence: 3
            },
            {
                name: `Update ${entityName}`,
                method: 'PUT',
                url: `${baseUrl}/${entityName.toLowerCase()}/{{id}}`,
                body: {
                    type: 'json',
                    content: JSON.stringify({
                        name: `Updated ${entityName}`,
                        description: `Updated description for ${entityName}`
                    }, null, 2)
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                sequence: 4
            },
            {
                name: `Delete ${entityName}`,
                method: 'DELETE',
                url: `${baseUrl}/${entityName.toLowerCase()}/{{id}}`,
                sequence: 5
            }
        ];
        for (const operation of crudOperations) {
            const result = await this.createRequest({
                collectionPath,
                ...operation,
                folder
            });
            results.push(result);
        }
        return results;
    }
    /**
     * Create authentication test requests
     */
    async createAuthRequests(collectionPath, baseUrl, authType, folder = 'auth') {
        const results = [];
        const authRequests = [
            {
                name: 'Login',
                method: 'POST',
                url: `${baseUrl}/auth/login`,
                body: {
                    type: 'json',
                    content: JSON.stringify({
                        username: '{{username}}',
                        password: '{{password}}'
                    }, null, 2)
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                sequence: 1
            },
            {
                name: 'Get Profile',
                method: 'GET',
                url: `${baseUrl}/auth/profile`,
                auth: authType !== 'none' ? {
                    type: authType,
                    config: authType === 'bearer' ? { token: '{{token}}' } : { username: '{{username}}', password: '{{password}}' }
                } : undefined,
                sequence: 2
            },
            {
                name: 'Refresh Token',
                method: 'POST',
                url: `${baseUrl}/auth/refresh`,
                body: {
                    type: 'json',
                    content: JSON.stringify({
                        refreshToken: '{{refreshToken}}'
                    }, null, 2)
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                sequence: 3
            },
            {
                name: 'Logout',
                method: 'POST',
                url: `${baseUrl}/auth/logout`,
                auth: authType !== 'none' ? {
                    type: authType,
                    config: authType === 'bearer' ? { token: '{{token}}' } : { username: '{{username}}', password: '{{password}}' }
                } : undefined,
                sequence: 4
            }
        ];
        for (const authRequest of authRequests) {
            const result = await this.createRequest({
                collectionPath,
                ...authRequest,
                folder
            });
            results.push(result);
        }
        return results;
    }
    /**
     * Set (replace) the pre-request/post-response script or tests block on an existing
     * request, preserving every other field via the real parser + generator round-trip.
     */
    async setScript(filePath, scriptType, script) {
        try {
            const existing = await this.loadRequest(filePath);
            const exec = script.split('\n');
            if (scriptType === 'tests') {
                existing.tests = { exec };
            }
            else {
                existing.script = { ...existing.script, [scriptType]: { exec } };
            }
            const bruContent = generateBruFile(existing);
            await fs.writeFile(filePath, bruContent);
            return { success: true, path: filePath };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Set (replace) the markdown docs block on an existing request, preserving every
     * other field via the real parser + generator round-trip.
     */
    async setDocs(filePath, docs) {
        try {
            const existing = await this.loadRequest(filePath);
            existing.docs = docs;
            const bruContent = generateBruFile(existing);
            await fs.writeFile(filePath, bruContent);
            return { success: true, path: filePath };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Build BRU file structure from input
     */
    buildBruFile(input) {
        const bruFile = {
            meta: {
                name: input.name,
                type: 'http',
                seq: input.sequence
            },
            http: {
                method: input.method,
                url: input.url,
                body: input.body?.type || 'none',
                auth: input.auth?.type || 'none'
            }
        };
        // Add headers if provided
        if (input.headers && Object.keys(input.headers).length > 0) {
            bruFile.headers = input.headers;
        }
        // Add query parameters if provided
        if (input.query && Object.keys(input.query).length > 0) {
            bruFile.query = input.query;
        }
        // Add body if provided
        if (input.body && input.body.type !== 'none') {
            bruFile.body = {
                type: input.body.type,
                content: input.body.content
            };
            // Handle form data
            if (input.body.formData) {
                bruFile.body.formData = input.body.formData.map(field => ({
                    name: field.name,
                    value: field.value,
                    type: field.type || 'text',
                    enabled: true
                }));
            }
        }
        // Add authentication if provided
        if (input.auth && input.auth.type !== 'none') {
            bruFile.auth = this.buildAuthBlock(input.auth.type, input.auth.config);
        }
        return bruFile;
    }
    /**
     * Build a BruAuth object from an auth type + flat config map. Shared by request
     * creation and by applyUpdates(), so an auth update populates the right sub-object
     * instead of only setting `type` and dropping the credentials (the sub-object is
     * what generateBruFile() actually reads to emit the auth block's fields).
     */
    buildAuthBlock(authType, config) {
        const auth = { type: authType };
        switch (authType) {
            case 'bearer':
                auth.bearer = {
                    token: config.token || '{{token}}'
                };
                break;
            case 'basic':
                auth.basic = {
                    username: config.username || '{{username}}',
                    password: config.password || '{{password}}'
                };
                break;
            case 'oauth2':
                auth.oauth2 = {
                    grantType: config.grantType || 'client_credentials',
                    accessTokenUrl: config.accessTokenUrl,
                    authorizationUrl: config.authorizationUrl,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    scope: config.scope,
                    username: config.username,
                    password: config.password
                };
                break;
            case 'api-key':
                auth.apikey = {
                    key: config.key || 'X-API-Key',
                    value: config.value || '{{apiKey}}',
                    in: config.in || 'header'
                };
                break;
            case 'digest':
                auth.digest = {
                    username: config.username || '{{username}}',
                    password: config.password || '{{password}}'
                };
                break;
        }
        return auth;
    }
    /**
     * Get file path for request
     */
    getRequestFilePath(input) {
        const fileName = this.sanitizeFileName(input.name) + '.bru';
        if (input.folder) {
            return join(input.collectionPath, input.folder, fileName);
        }
        return join(input.collectionPath, fileName);
    }
    /**
     * Sanitize file name for filesystem
     */
    sanitizeFileName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    /**
     * Apply updates to existing BRU file. Untouched fields (e.g. headers not mentioned
     * in `updates`, or the whole file when only `name` changes) are preserved as-is,
     * since `existingBru` comes from the real parser and already has full fidelity.
     */
    applyUpdates(existingBru, updates) {
        const updated = { ...existingBru, meta: { ...existingBru.meta }, http: { ...existingBru.http } };
        if (updates.name) {
            updated.meta.name = updates.name;
        }
        if (updates.method) {
            updated.http.method = updates.method;
        }
        if (updates.url) {
            updated.http.url = updates.url;
        }
        if (updates.headers) {
            updated.headers = { ...updated.headers, ...updates.headers };
        }
        if (updates.body) {
            updated.http.body = updates.body.type;
            updated.body = {
                type: updates.body.type,
                content: updates.body.content
            };
        }
        if (updates.auth) {
            updated.http.auth = updates.auth.type;
            updated.auth = updates.auth.type === 'none'
                ? undefined
                : this.buildAuthBlock(updates.auth.type, updates.auth.config);
        }
        return updated;
    }
    /**
     * Validate request input
     */
    validateRequestInput(input) {
        if (!input.name || input.name.trim().length === 0) {
            throw new BrunoError('Request name is required', 'VALIDATION_ERROR');
        }
        if (!input.collectionPath || input.collectionPath.trim().length === 0) {
            throw new BrunoError('Collection path is required', 'VALIDATION_ERROR');
        }
        if (!input.method) {
            throw new BrunoError('HTTP method is required', 'VALIDATION_ERROR');
        }
        if (!input.url || input.url.trim().length === 0) {
            throw new BrunoError('URL is required', 'VALIDATION_ERROR');
        }
        // Validate HTTP method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        if (!validMethods.includes(input.method)) {
            throw new BrunoError(`Invalid HTTP method: ${input.method}`, 'VALIDATION_ERROR');
        }
        // Validate auth configuration if provided
        if (input.auth && input.auth.type !== 'none') {
            this.validateAuthConfig(input.auth.type, input.auth.config);
        }
    }
    /**
     * Validate authentication configuration
     */
    validateAuthConfig(authType, config) {
        switch (authType) {
            case 'bearer':
                if (!config.token) {
                    throw new BrunoError('Bearer token is required', 'VALIDATION_ERROR');
                }
                break;
            case 'basic':
                if (!config.username || !config.password) {
                    throw new BrunoError('Username and password are required for basic auth', 'VALIDATION_ERROR');
                }
                break;
            case 'api-key':
                if (!config.key || !config.value) {
                    throw new BrunoError('Key and value are required for API key auth', 'VALIDATION_ERROR');
                }
                break;
            case 'digest':
                if (!config.username || !config.password) {
                    throw new BrunoError('Username and password are required for digest auth', 'VALIDATION_ERROR');
                }
                break;
            // oauth2 has no strictly required field here (grantType defaults to
            // client_credentials, other fields depend on the chosen grant type).
        }
    }
    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        }
        catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
}
/**
 * Create a new request builder instance
 */
export function createRequestBuilder() {
    return new RequestBuilder();
}
//# sourceMappingURL=request.js.map