/**
 * Bruno environment management
 * Handles creation and management of Bruno environment files
 */
import { BrunoEnvironment, CreateEnvironmentInput, FileOperationResult } from './types.js';
export declare class EnvironmentManager {
    /**
     * Create a new environment file
     */
    createEnvironment(input: CreateEnvironmentInput): Promise<FileOperationResult>;
    /**
     * Load an existing environment
     */
    loadEnvironment(collectionPath: string, environmentName: string): Promise<BrunoEnvironment>;
    /**
     * Update an existing environment
     */
    updateEnvironment(collectionPath: string, environmentName: string, variables: Record<string, string | number | boolean>): Promise<FileOperationResult>;
    /**
     * Delete an environment
     */
    deleteEnvironment(collectionPath: string, environmentName: string): Promise<FileOperationResult>;
    /**
     * List all environments in a collection
     */
    listEnvironments(collectionPath: string): Promise<string[]>;
    /**
     * Copy environment with new name
     */
    copyEnvironment(collectionPath: string, sourceEnv: string, targetEnv: string, variableOverrides?: Record<string, string | number | boolean>): Promise<FileOperationResult>;
    /**
     * Get environment variables as key-value pairs
     */
    getEnvironmentVariables(collectionPath: string, environmentName: string): Promise<Record<string, string | number | boolean>>;
    /**
     * Set a specific variable in an environment
     */
    setEnvironmentVariable(collectionPath: string, environmentName: string, key: string, value: string | number | boolean): Promise<FileOperationResult>;
    /**
     * Remove a variable from an environment
     */
    removeEnvironmentVariable(collectionPath: string, environmentName: string, key: string): Promise<FileOperationResult>;
    /**
     * Generate environment file content in BRU format
     */
    private generateEnvironmentFile;
    /**
     * Parse environment file content
     */
    private parseEnvironmentFile;
    /**
     * Format variable value for BRU file
     */
    private formatVariableValue;
    /**
     * Parse variable value from BRU file
     */
    private parseVariableValue;
    /**
     * Validate environment input
     */
    private validateEnvironmentInput;
    /**
     * Ensure directory exists
     */
    private ensureDirectory;
    /**
     * Check if file exists
     */
    private fileExists;
    /**
     * Check if directory exists
     */
    private directoryExists;
}
/**
 * Create a new environment manager instance
 */
export declare function createEnvironmentManager(): EnvironmentManager;
/**
 * Create common environment configurations
 */
export declare const commonEnvironments: {
    development: {
        baseUrl: string;
        apiKey: string;
        timeout: number;
        debug: boolean;
    };
    staging: {
        baseUrl: string;
        apiKey: string;
        timeout: number;
        debug: boolean;
    };
    production: {
        baseUrl: string;
        apiKey: string;
        timeout: number;
        debug: boolean;
    };
};
//# sourceMappingURL=environment.d.ts.map