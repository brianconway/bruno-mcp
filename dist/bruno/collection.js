/**
 * Bruno collection management
 * Handles creation and management of Bruno collections
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { BrunoError, BruFileError } from './types.js';
import { parseBruFile } from './parser.js';
export class CollectionManager {
    /**
     * Create a new Bruno collection
     */
    async createCollection(input) {
        try {
            // Validate input
            this.validateCollectionInput(input);
            // Create collection directory
            const collectionPath = join(input.outputPath, input.name);
            await this.ensureDirectory(collectionPath);
            // Create bruno.json configuration
            const brunoConfig = {
                version: '1',
                name: input.name,
                type: 'collection',
                ignore: input.ignore || ['node_modules', '.git', '.env']
            };
            const configPath = join(collectionPath, 'bruno.json');
            await fs.writeFile(configPath, JSON.stringify(brunoConfig, null, 2));
            // Create environments directory
            const envPath = join(collectionPath, 'environments');
            await this.ensureDirectory(envPath);
            // Create .gitignore if it doesn't exist
            const gitignorePath = join(collectionPath, '.gitignore');
            const gitignoreExists = await this.fileExists(gitignorePath);
            if (!gitignoreExists) {
                await this.createGitignore(gitignorePath);
            }
            // Create README.md with basic collection info
            const readmePath = join(collectionPath, 'README.md');
            await this.createCollectionReadme(readmePath, input);
            return {
                success: true,
                path: collectionPath
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
     * Load an existing Bruno collection
     */
    async loadCollection(collectionPath) {
        try {
            const configPath = join(collectionPath, 'bruno.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            this.validateCollectionConfig(config);
            return config;
        }
        catch (error) {
            throw new BruFileError(`Failed to load collection from ${collectionPath}`, { originalError: error });
        }
    }
    /**
     * Update collection configuration
     */
    async updateCollection(collectionPath, updates) {
        try {
            const existingConfig = await this.loadCollection(collectionPath);
            const updatedConfig = { ...existingConfig, ...updates };
            this.validateCollectionConfig(updatedConfig);
            const configPath = join(collectionPath, 'bruno.json');
            await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
            return {
                success: true,
                path: configPath
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
     * List all .bru files in a collection
     */
    async listRequests(collectionPath) {
        try {
            const bruFiles = [];
            await this.findBruFiles(collectionPath, bruFiles);
            return bruFiles.sort();
        }
        catch (error) {
            throw new BruFileError(`Failed to list requests in collection ${collectionPath}`, { originalError: error });
        }
    }
    /**
     * Create a folder structure within the collection
     */
    async createFolder(collectionPath, folderPath) {
        try {
            const fullPath = join(collectionPath, folderPath);
            await this.ensureDirectory(fullPath);
            return {
                success: true,
                path: fullPath
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
     * Recursively find Bruno collections (directories containing a bruno.json) under a
     * root directory.
     */
    async listCollections(rootPath) {
        const found = [];
        await this.findCollections(rootPath, found);
        return found.sort((a, b) => a.path.localeCompare(b.path));
    }
    /**
     * Get collection statistics
     */
    async getCollectionStats(collectionPath) {
        try {
            const requests = await this.listRequests(collectionPath);
            const folders = await this.listFolders(collectionPath);
            const environments = await this.listEnvironments(collectionPath);
            const requestsByMethod = {};
            for (const requestPath of requests) {
                try {
                    const content = await fs.readFile(requestPath, 'utf-8');
                    const { http } = parseBruFile(content);
                    requestsByMethod[http.method] = (requestsByMethod[http.method] || 0) + 1;
                }
                catch {
                    // Skip files that aren't parseable .bru requests rather than failing the
                    // whole stats call over one bad file.
                }
            }
            return {
                totalRequests: requests.length,
                requestsByMethod,
                folders,
                environments
            };
        }
        catch (error) {
            throw new BruFileError(`Failed to get collection stats for ${collectionPath}`, { originalError: error });
        }
    }
    /**
     * Validate collection input
     */
    validateCollectionInput(input) {
        if (!input.name || input.name.trim().length === 0) {
            throw new BrunoError('Collection name is required', 'VALIDATION_ERROR');
        }
        if (!input.outputPath || input.outputPath.trim().length === 0) {
            throw new BrunoError('Output path is required', 'VALIDATION_ERROR');
        }
        // Check for invalid characters in collection name
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(input.name)) {
            throw new BrunoError('Collection name contains invalid characters', 'VALIDATION_ERROR');
        }
    }
    /**
     * Validate collection configuration
     */
    validateCollectionConfig(config) {
        if (!config.name || config.name.trim().length === 0) {
            throw new BrunoError('Collection name is required', 'VALIDATION_ERROR');
        }
        if (!config.version) {
            throw new BrunoError('Collection version is required', 'VALIDATION_ERROR');
        }
        if (config.type !== 'collection') {
            throw new BrunoError('Collection type must be "collection"', 'VALIDATION_ERROR');
        }
    }
    /**
     * Ensure directory exists, create if it doesn't
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        }
        catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Create .gitignore file for Bruno collection
     */
    async createGitignore(gitignorePath) {
        const gitignoreContent = `# Bruno collection files to ignore
*.tmp
*.temp
.env
.env.local
.env.*.local

# OS generated files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo
`;
        await fs.writeFile(gitignorePath, gitignoreContent);
    }
    /**
     * Create README.md for collection
     */
    async createCollectionReadme(readmePath, input) {
        const readmeContent = `# ${input.name}

${input.description || 'Bruno API testing collection'}

## Overview

This collection was generated using the Bruno MCP server.

${input.baseUrl ? `**Base URL:** \`${input.baseUrl}\`` : ''}

## Structure

- \`environments/\` - Environment configurations
- \`*.bru\` - API request files

## Usage

Run all tests:
\`\`\`bash
bru run
\`\`\`

Run specific environment:
\`\`\`bash
bru run --env production
\`\`\`

## Generated

Created on: ${new Date().toISOString()}
`;
        await fs.writeFile(readmePath, readmeContent);
    }
    /**
     * Recursively find all .bru files
     */
    async findBruFiles(dirPath, bruFiles) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                await this.findBruFiles(fullPath, bruFiles);
            }
            else if (entry.isFile() && entry.name.endsWith('.bru')) {
                bruFiles.push(fullPath);
            }
        }
    }
    /**
     * Recursively scan for bruno.json files, treating each one's directory as a
     * collection root (and not descending further into it, since a collection's own
     * subfolders are request folders, not nested collections).
     */
    async findCollections(dirPath, found) {
        let entries;
        try {
            entries = await fs.readdir(dirPath, { withFileTypes: true });
        }
        catch {
            return;
        }
        if (entries.some((entry) => entry.isFile() && entry.name === 'bruno.json')) {
            try {
                const config = await this.loadCollection(dirPath);
                found.push({ name: config.name, path: dirPath });
            }
            catch {
                found.push({ name: dirPath, path: dirPath });
            }
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                await this.findCollections(join(dirPath, entry.name), found);
            }
        }
    }
    /**
     * List all folders in collection
     */
    async listFolders(collectionPath) {
        const folders = [];
        const entries = await fs.readdir(collectionPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() &&
                entry.name !== 'environments' &&
                entry.name !== 'node_modules' &&
                entry.name !== '.git') {
                folders.push(entry.name);
            }
        }
        return folders.sort();
    }
    /**
     * List all environment files
     */
    async listEnvironments(collectionPath) {
        try {
            const envPath = join(collectionPath, 'environments');
            const entries = await fs.readdir(envPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isFile() && entry.name.endsWith('.bru'))
                .map(entry => entry.name.replace('.bru', ''))
                .sort();
        }
        catch {
            return [];
        }
    }
}
/**
 * Create a new collection manager instance
 */
export function createCollectionManager() {
    return new CollectionManager();
}
//# sourceMappingURL=collection.js.map