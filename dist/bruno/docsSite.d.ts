/**
 * Standalone API-docs site generator. Bruno's own "build an HTML docs site" feature
 * is desktop-GUI-only (Collection Settings -> Documentation -> Generate Docs) with no
 * CLI/scriptable equivalent (confirmed: no `bru docs` command exists, and the
 * usebruno/bruno-api-docs renderer isn't shipped as a standalone package yet). This
 * is a deliberately simpler, fully scriptable, single-self-contained-HTML-file
 * replacement: not a pixel-for-pixel match of Bruno's own renderer, just something
 * that works without opening the GUI.
 */
import { CollectionManager } from './collection.js';
export interface GenerateDocsSiteOptions {
    collectionPath: string;
    outputPath: string;
}
export declare function generateDocsSite(collectionManager: CollectionManager, options: GenerateDocsSiteOptions): Promise<{
    success: boolean;
    path?: string;
    error?: string;
}>;
//# sourceMappingURL=docsSite.d.ts.map