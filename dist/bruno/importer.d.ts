/**
 * Wrapper around `bru import openapi`.
 */
export interface ImportOpenApiOptions {
    source: string;
    outputDir: string;
    collectionName?: string;
    groupBy?: 'tags' | 'path';
    insecure?: boolean;
}
export interface ImportResult {
    success: boolean;
    message: string;
    outputPath?: string;
}
export declare function importOpenApi(options: ImportOpenApiOptions): Promise<ImportResult>;
//# sourceMappingURL=importer.d.ts.map