/**
 * Folder-level metadata/docs, stored as a small `folder.bru` file per folder — this
 * matches Bruno's own real on-disk convention for folder metadata. Reuses parser.ts's
 * block-splitting/key-value primitives rather than duplicating them, since a
 * folder.bru is shaped the same way as a request .bru file (just without an http
 * block, which parseBruFile requires).
 */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { splitTopLevelBlocks, parseKeyValueBlock, parseBlobText } from './parser.js';
const FOLDER_META_FILE = 'folder.bru';
function indentLine(line) {
    return line.trim() ? `  ${line}` : line;
}
export function generateFolderBru(folder) {
    const lines = ['meta {', indentLine(`name: ${folder.name}`), indentLine('type: folder'), '}'];
    if (folder.docs) {
        lines.push('', 'docs {', ...folder.docs.split('\n').map(indentLine), '}');
    }
    return `${lines.join('\n')}\n`;
}
export function parseFolderBru(content) {
    const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const blocks = splitTopLevelBlocks(rawLines);
    let name = '';
    let docs;
    for (const block of blocks) {
        if (block.header === 'meta') {
            const map = parseKeyValueBlock(block.lines);
            const rawName = map.get('name');
            name = typeof rawName === 'string' ? rawName : String(rawName ?? '');
        }
        else if (block.header === 'docs') {
            docs = parseBlobText(block.lines);
        }
    }
    return { name, docs };
}
export async function readFolderDocs(folderPath) {
    try {
        const content = await fs.readFile(join(folderPath, FOLDER_META_FILE), 'utf-8');
        return parseFolderBru(content).docs;
    }
    catch {
        return undefined;
    }
}
export async function writeFolderDocs(folderPath, folderName, docs) {
    const filePath = join(folderPath, FOLDER_META_FILE);
    await fs.writeFile(filePath, generateFolderBru({ name: folderName, docs }));
    return filePath;
}
//# sourceMappingURL=folder.js.map