import { z } from 'zod';
import { basename } from 'node:path';
import { writeFolderDocs } from '../bruno/folder.js';
import { generateDocsSite } from '../bruno/docsSite.js';
import { ok, err, errorMessage } from './helpers.js';
export function registerDocsTools(server, deps) {
    const { collectionManager, requestBuilder } = deps;
    server.registerTool('set_docs', {
        title: 'Set Bruno Docs',
        description: 'Write/replace markdown documentation at the collection, folder, or request level. Collection docs live in bruno.json; folder docs live in a folder.bru; request docs live in the request\'s own .bru docs block.',
        inputSchema: {
            target: z.enum(['collection', 'folder', 'request']),
            markdown: z.string().min(1, 'Markdown content is required'),
            collectionPath: z.string().optional().describe('Required for target=collection'),
            folderPath: z.string().optional().describe('Required for target=folder'),
            folderName: z.string().optional().describe('Optional display name for target=folder; defaults to the folder\'s directory name'),
            bruFilePath: z.string().optional().describe('Required for target=request')
        }
    }, async (args) => {
        try {
            if (args.target === 'collection') {
                if (!args.collectionPath)
                    return err('❌ collectionPath is required when target is "collection"');
                const result = await collectionManager.updateCollection(args.collectionPath, { docs: args.markdown });
                return result.success ? ok(`✅ Collection docs updated at: ${result.path}`) : err(`❌ Failed to set collection docs: ${result.error}`);
            }
            if (args.target === 'folder') {
                if (!args.folderPath)
                    return err('❌ folderPath is required when target is "folder"');
                const folderName = args.folderName ?? basename(args.folderPath);
                const path = await writeFolderDocs(args.folderPath, folderName, args.markdown);
                return ok(`✅ Folder docs written to: ${path}`);
            }
            if (!args.bruFilePath)
                return err('❌ bruFilePath is required when target is "request"');
            const result = await requestBuilder.setDocs(args.bruFilePath, args.markdown);
            return result.success ? ok(`✅ Request docs updated at: ${result.path}`) : err(`❌ Failed to set request docs: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error setting docs: ${errorMessage(error)}`);
        }
    });
    server.registerTool('generate_docs_site', {
        title: 'Generate API Docs Site',
        description: 'Render a single self-contained HTML API docs page for a collection (collection/folder/request docs, methods, URLs, headers, with client-side search). A lightweight, fully scriptable stand-in for Bruno\'s desktop-only "Generate Docs" feature.',
        inputSchema: {
            collectionPath: z.string().min(1, 'Collection path is required'),
            outputPath: z.string().min(1, 'Output HTML file path is required')
        }
    }, async (args) => {
        try {
            const result = await generateDocsSite(collectionManager, args);
            return result.success
                ? ok(`✅ Docs site generated at: ${result.path}`)
                : err(`❌ Failed to generate docs site: ${result.error}`);
        }
        catch (error) {
            return err(`❌ Error generating docs site: ${errorMessage(error)}`);
        }
    });
}
//# sourceMappingURL=docsTools.js.map