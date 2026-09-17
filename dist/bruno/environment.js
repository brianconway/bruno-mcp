/**
 * Bruno environment management
 * Handles creation and management of Bruno environment files
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { BrunoError, BruFileError } from './types.js';
export class EnvironmentManager {
    /**
     * Create a new environment file
     */
    async createEnvironment(input) {
        try {
            // Validate input
            this.validateEnvironmentInput(input);
            // Ensure environments directory exists
            const envDir = join(input.collectionPath, 'environments');
            await this.ensureDirectory(envDir);
            // Create environment file
            const envFilePath = join(envDir, `${input.name}.bru`);
            const envContent = this.generateEnvironmentFile(input.variables);
            await fs.writeFile(envFilePath, envContent);
            return {
                success: true,
                path: envFilePath
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
     * Load an existing environment
     */
    async loadEnvironment(collectionPath, environmentName) {
        try {
            const envFilePath = join(collectionPath, 'environments', `${environmentName}.bru`);
            const envContent = await fs.readFile(envFilePath, 'utf-8');
            return this.parseEnvironmentFile(envContent, environmentName);
        }
        catch (error) {
            throw new BruFileError(`Failed to load environment ${environmentName}`, { originalError: error });
        }
    }
    /**
     * Update an existing environment
     */
    async updateEnvironment(collectionPath, environmentName, variables) {
        try {
            const envDir = join(collectionPath, 'environments');
            const envFilePath = join(envDir, `${environmentName}.bru`);
            // Check if environment exists
            const exists = await this.fileExists(envFilePath);
            if (!exists) {
                throw new BrunoError(`Environment ${environmentName} does not exist`, 'NOT_FOUND');
            }
            // Generate updated content
            const envContent = this.generateEnvironmentFile(variables);
            await fs.writeFile(envFilePath, envContent);
            return {
                success: true,
                path: envFilePath
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
     * Delete an environment
     */
    async deleteEnvironment(collectionPath, environmentName) {
        try {
            const envFilePath = join(collectionPath, 'environments', `${environmentName}.bru`);
            const exists = await this.fileExists(envFilePath);
            if (!exists) {
                return {
                    success: false,
                    error: `Environment ${environmentName} does not exist`
                };
            }
            await fs.unlink(envFilePath);
            return {
                success: true,
                path: envFilePath
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
     * List all environments in a collection
     */
    async listEnvironments(collectionPath) {
        try {
            const envDir = join(collectionPath, 'environments');
            const exists = await this.directoryExists(envDir);
            if (!exists) {
                return [];
            }
            const entries = await fs.readdir(envDir, { withFileTypes: true });
            return entries
                .filter(entry => entry.isFile() && entry.name.endsWith('.bru'))
                .map(entry => entry.name.replace('.bru', ''))
                .sort();
        }
        catch (error) {
            throw new BruFileError(`Failed to list environments in ${collectionPath}`, { originalError: error });
        }
    }
    /**
     * Copy environment with new name
     */
    async copyEnvironment(collectionPath, sourceEnv, targetEnv, variableOverrides) {
        try {
            // Load source environment
            const sourceEnvironment = await this.loadEnvironment(collectionPath, sourceEnv);
            // Merge variables with overrides
            const variables = variableOverrides
                ? { ...sourceEnvironment.variables, ...variableOverrides }
                : sourceEnvironment.variables;
            // Create new environment
            return await this.createEnvironment({
                collectionPath,
                name: targetEnv,
                variables
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get environment variables as key-value pairs
     */
    async getEnvironmentVariables(collectionPath, environmentName) {
        const environment = await this.loadEnvironment(collectionPath, environmentName);
        return environment.variables;
    }
    /**
     * Set a specific variable in an environment
     */
    async setEnvironmentVariable(collectionPath, environmentName, key, value) {
        try {
            const environment = await this.loadEnvironment(collectionPath, environmentName);
            environment.variables[key] = value;
            return await this.updateEnvironment(collectionPath, environmentName, environment.variables);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Remove a variable from an environment
     */
    async removeEnvironmentVariable(collectionPath, environmentName, key) {
        try {
            const environment = await this.loadEnvironment(collectionPath, environmentName);
            delete environment.variables[key];
            return await this.updateEnvironment(collectionPath, environmentName, environment.variables);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Generate environment file content in BRU format
     */
    generateEnvironmentFile(variables) {
        // No leading comment lines here: the real Bruno CLI's environment parser rejects
        // anything before the first block ("Expected end of input" at line 1, col 1) —
        // confirmed against the actual `bru run --env <name>` command, which fails
        // outright on a file starting with `# ...` comments. Unlike request .bru files,
        // environment files apparently must start directly with `vars {`.
        const lines = ['vars {'];
        Object.entries(variables).forEach(([key, value]) => {
            const formattedValue = this.formatVariableValue(value);
            lines.push(`  ${key}: ${formattedValue}`);
        });
        lines.push('}');
        return lines.join('\n') + '\n';
    }
    /**
     * Parse environment file content
     */
    parseEnvironmentFile(content, name) {
        const variables = {};
        // Simple parser for vars block
        const varsMatch = content.match(/vars\s*\{([^}]*)\}/s);
        if (varsMatch) {
            const varsContent = varsMatch[1];
            const lines = varsContent.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const colonIndex = trimmed.indexOf(':');
                    if (colonIndex > 0) {
                        const key = trimmed.substring(0, colonIndex).trim();
                        const valueStr = trimmed.substring(colonIndex + 1).trim();
                        const value = this.parseVariableValue(valueStr);
                        variables[key] = value;
                    }
                }
            }
        }
        return { name, variables };
    }
    /**
     * Format variable value for BRU file.
     *
     * Unlike header/query/vars-block values elsewhere in this project (which the real
     * Bruno CLI happily parses quoted), an *environment* variable's value must be
     * emitted bare — confirmed empirically: `baseUrl: 'https://...'` makes `{{baseUrl}}`
     * substitution include the literal quote character, producing
     * `getaddrinfo ENOTFOUND 'https`, while `baseUrl: https://...` (no quotes) works.
     * parseVariableValue() below already has an unquoted-string fallback, so this
     * still round-trips correctly through this module's own parser.
     */
    formatVariableValue(value) {
        return String(value);
    }
    /**
     * Parse variable value from BRU file
     */
    parseVariableValue(valueStr) {
        const trimmed = valueStr.trim();
        // Handle quoted strings
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return trimmed.slice(1, -1).replace(/\\'/g, "'");
        }
        // Handle booleans
        if (trimmed === 'true')
            return true;
        if (trimmed === 'false')
            return false;
        // Handle numbers
        const numValue = Number(trimmed);
        if (!isNaN(numValue)) {
            return numValue;
        }
        // Default to string (unquoted)
        return trimmed;
    }
    /**
     * Validate environment input
     */
    validateEnvironmentInput(input) {
        if (!input.name || input.name.trim().length === 0) {
            throw new BrunoError('Environment name is required', 'VALIDATION_ERROR');
        }
        if (!input.collectionPath || input.collectionPath.trim().length === 0) {
            throw new BrunoError('Collection path is required', 'VALIDATION_ERROR');
        }
        // Check for invalid characters in environment name
        const invalidChars = /[<>:"/\\|?*\s]/;
        if (invalidChars.test(input.name)) {
            throw new BrunoError('Environment name contains invalid characters or spaces', 'VALIDATION_ERROR');
        }
        if (!input.variables || typeof input.variables !== 'object') {
            throw new BrunoError('Variables must be an object', 'VALIDATION_ERROR');
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
     * Check if directory exists
     */
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
}
/**
 * Create a new environment manager instance
 */
export function createEnvironmentManager() {
    return new EnvironmentManager();
}
/**
 * Create common environment configurations
 */
export const commonEnvironments = {
    development: {
        baseUrl: 'http://localhost:3000',
        apiKey: 'dev-api-key',
        timeout: 5000,
        debug: true
    },
    staging: {
        baseUrl: 'https://staging-api.example.com',
        apiKey: 'staging-api-key',
        timeout: 10000,
        debug: false
    },
    production: {
        baseUrl: 'https://api.example.com',
        apiKey: 'prod-api-key',
        timeout: 30000,
        debug: false
    }
};
//# sourceMappingURL=environment.js.map