import { promises as fs } from 'node:fs';
import { join } from 'node:path';
function sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'mock';
}
function mocksDir(collectionPath) {
    return join(collectionPath, '.bruno-mcp', 'mocks');
}
export function mockConfigPath(collectionPath, name) {
    return join(mocksDir(collectionPath), `${sanitizeName(name)}.json`);
}
export async function saveMockConfig(collectionPath, name, routes, port) {
    await fs.mkdir(mocksDir(collectionPath), { recursive: true });
    const filePath = mockConfigPath(collectionPath, name);
    const now = new Date().toISOString();
    let createdAt = now;
    try {
        const existing = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        createdAt = existing.createdAt;
    }
    catch {
        // no existing config — this is a fresh one
    }
    const config = { name, collectionPath, port, routes, createdAt, updatedAt: now };
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    return config;
}
export async function loadMockConfig(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}
//# sourceMappingURL=config.js.map