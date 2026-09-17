/**
 * Bruno collection management
 * Handles creation and management of Bruno collections
 */
import { BrunoCollection, CreateCollectionInput, FileOperationResult } from './types.js';
export declare class CollectionManager {
    /**
     * Create a new Bruno collection
     */
    createCollection(input: CreateCollectionInput): Promise<FileOperationResult>;
    /**
     * Load an existing Bruno collection
     */
    loadCollection(collectionPath: string): Promise<BrunoCollection>;
    /**
     * Update collection configuration
     */
    updateCollection(collectionPath: string, updates: Partial<BrunoCollection>): Promise<FileOperationResult>;
    /**
     * List all .bru files in a collection
     */
    listRequests(collectionPath: string): Promise<string[]>;
    /**
     * Create a folder structure within the collection
     */
    createFolder(collectionPath: string, folderPath: string): Promise<FileOperationResult>;
    /**
     * Recursively find Bruno collections (directories containing a bruno.json) under a
     * root directory.
     */
    listCollections(rootPath: string): Promise<Array<{
        name: string;
        path: string;
    }>>;
    /**
     * Get collection statistics
     */
    getCollectionStats(collectionPath: string): Promise<{
        totalRequests: number;
        requestsByMethod: Record<string, number>;
        folders: string[];
        environments: string[];
    }>;
    /**
     * Validate collection input
     */
    private validateCollectionInput;
    /**
     * Validate collection configuration
     */
    private validateCollectionConfig;
    /**
     * Ensure directory exists, create if it doesn't
     */
    private ensureDirectory;
    /**
     * Check if file exists
     */
    private fileExists;
    /**
     * Create .gitignore file for Bruno collection
     */
    private createGitignore;
    /**
     * Create README.md for collection
     */
    private createCollectionReadme;
    /**
     * Recursively find all .bru files
     */
    private findBruFiles;
    /**
     * Recursively scan for bruno.json files, treating each one's directory as a
     * collection root (and not descending further into it, since a collection's own
     * subfolders are request folders, not nested collections).
     */
    private findCollections;
    /**
     * List all folders in collection
     */
    private listFolders;
    /**
     * List all environment files
     */
    private listEnvironments;
}
/**
 * Create a new collection manager instance
 */
export declare function createCollectionManager(): CollectionManager;
//# sourceMappingURL=collection.d.ts.map