/**
 * Folder-level metadata/docs, stored as a small `folder.bru` file per folder — this
 * matches Bruno's own real on-disk convention for folder metadata. Reuses parser.ts's
 * block-splitting/key-value primitives rather than duplicating them, since a
 * folder.bru is shaped the same way as a request .bru file (just without an http
 * block, which parseBruFile requires).
 */
export interface BruFolderFile {
    name: string;
    docs?: string;
}
export declare function generateFolderBru(folder: BruFolderFile): string;
export declare function parseFolderBru(content: string): BruFolderFile;
export declare function readFolderDocs(folderPath: string): Promise<string | undefined>;
export declare function writeFolderDocs(folderPath: string, folderName: string, docs: string): Promise<string>;
//# sourceMappingURL=folder.d.ts.map