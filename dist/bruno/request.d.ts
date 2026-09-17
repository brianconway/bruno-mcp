/**
 * Bruno request builder
 * Handles creation and management of .bru request files
 */
import { BruFile, CreateRequestInput, FileOperationResult, AuthType } from './types.js';
export declare class RequestBuilder {
    /**
     * Create a new .bru request file
     */
    createRequest(input: CreateRequestInput): Promise<FileOperationResult>;
    /**
     * Load an existing .bru request file
     */
    loadRequest(filePath: string): Promise<BruFile>;
    /**
     * Update an existing request
     */
    updateRequest(filePath: string, updates: Partial<CreateRequestInput>): Promise<FileOperationResult>;
    /**
     * Create multiple related requests (CRUD operations)
     */
    createCrudRequests(collectionPath: string, entityName: string, baseUrl: string, folder?: string): Promise<FileOperationResult[]>;
    /**
     * Create authentication test requests
     */
    createAuthRequests(collectionPath: string, baseUrl: string, authType: AuthType, folder?: string): Promise<FileOperationResult[]>;
    /**
     * Set (replace) the pre-request/post-response script or tests block on an existing
     * request, preserving every other field via the real parser + generator round-trip.
     */
    setScript(filePath: string, scriptType: 'pre-request' | 'post-response' | 'tests', script: string): Promise<FileOperationResult>;
    /**
     * Set (replace) the markdown docs block on an existing request, preserving every
     * other field via the real parser + generator round-trip.
     */
    setDocs(filePath: string, docs: string): Promise<FileOperationResult>;
    /**
     * Build BRU file structure from input
     */
    private buildBruFile;
    /**
     * Build a BruAuth object from an auth type + flat config map. Shared by request
     * creation and by applyUpdates(), so an auth update populates the right sub-object
     * instead of only setting `type` and dropping the credentials (the sub-object is
     * what generateBruFile() actually reads to emit the auth block's fields).
     */
    private buildAuthBlock;
    /**
     * Get file path for request
     */
    private getRequestFilePath;
    /**
     * Sanitize file name for filesystem
     */
    private sanitizeFileName;
    /**
     * Apply updates to existing BRU file. Untouched fields (e.g. headers not mentioned
     * in `updates`, or the whole file when only `name` changes) are preserved as-is,
     * since `existingBru` comes from the real parser and already has full fidelity.
     */
    private applyUpdates;
    /**
     * Validate request input
     */
    private validateRequestInput;
    /**
     * Validate authentication configuration
     */
    private validateAuthConfig;
    /**
     * Ensure directory exists
     */
    private ensureDirectory;
}
/**
 * Create a new request builder instance
 */
export declare function createRequestBuilder(): RequestBuilder;
//# sourceMappingURL=request.d.ts.map