/**
 * Standalone API-docs site generator. Bruno's own "build an HTML docs site" feature
 * is desktop-GUI-only (Collection Settings -> Documentation -> Generate Docs) with no
 * CLI/scriptable equivalent (confirmed: no `bru docs` command exists, and the
 * usebruno/bruno-api-docs renderer isn't shipped as a standalone package yet). This
 * is a deliberately simpler, fully scriptable, single-self-contained-HTML-file
 * replacement: not a pixel-for-pixel match of Bruno's own renderer, just something
 * that works without opening the GUI.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { CollectionManager } from './collection.js';
import { readFolderDocs } from './folder.js';
import { parseBruFile } from './parser.js';

export interface GenerateDocsSiteOptions {
  collectionPath: string;
  outputPath: string;
}

interface DocEntry {
  name: string;
  method: string;
  url: string;
  folder: string;
  docsHtml: string;
  headers: Record<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function folderOf(collectionPath: string, requestPath: string): string {
  const relativeDir = join(requestPath, '..').slice(collectionPath.length).replace(/^[\\/]/, '');
  return relativeDir || '(root)';
}

export async function generateDocsSite(
  collectionManager: CollectionManager,
  options: GenerateDocsSiteOptions
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // marked ships ESM-only (no CJS build) — a dynamic import works both from this
    // project's real ESM build and from the CJS-transpiled Jest test environment,
    // where a static `import` would fail to parse marked's own ESM syntax.
    const { marked } = await import('marked');
    const collection = await collectionManager.loadCollection(options.collectionPath);
    const requestPaths = await collectionManager.listRequests(options.collectionPath);

    const entries: DocEntry[] = [];
    const folderDocsCache = new Map<string, string | undefined>();

    for (const requestPath of requestPaths) {
      let bruFile;
      try {
        const content = await fs.readFile(requestPath, 'utf-8');
        bruFile = parseBruFile(content);
      } catch {
        continue;
      }

      const folder = folderOf(options.collectionPath, requestPath);
      const folderDir = join(requestPath, '..');
      if (!folderDocsCache.has(folderDir)) {
        folderDocsCache.set(folderDir, await readFolderDocs(folderDir));
      }

      entries.push({
        name: bruFile.meta.name,
        method: bruFile.http.method,
        url: bruFile.http.url,
        folder,
        docsHtml: bruFile.docs ? await marked.parse(bruFile.docs) : '',
        headers: bruFile.headers ?? {}
      });
    }

    entries.sort((a, b) => (a.folder + a.name).localeCompare(b.folder + b.name));

    const collectionDocsHtml = collection.docs ? await marked.parse(collection.docs) : '';
    const html = renderSite(collection.name, collectionDocsHtml, entries);

    await fs.mkdir(join(options.outputPath, '..'), { recursive: true }).catch(() => undefined);
    await fs.writeFile(options.outputPath, html, 'utf-8');

    return { success: true, path: options.outputPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function renderSite(collectionName: string, collectionDocsHtml: string, entries: DocEntry[]): string {
  const searchIndex = entries.map((e) => `${e.name} ${e.method} ${e.url} ${e.folder}`.toLowerCase());

  const entriesHtml = entries
    .map((entry, i) => {
      const headerRows = Object.entries(entry.headers)
        .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
        .join('');

      return `
<article class="request" data-index="${i}">
  <h3><span class="method method-${escapeHtml(entry.method.toLowerCase())}">${escapeHtml(entry.method)}</span> ${escapeHtml(entry.name)}</h3>
  <div class="meta">${escapeHtml(entry.folder)}</div>
  <code class="url">${escapeHtml(entry.url)}</code>
  ${entry.docsHtml ? `<div class="docs">${entry.docsHtml}</div>` : ''}
  ${headerRows ? `<table class="headers"><thead><tr><th>Header</th><th>Value</th></tr></thead><tbody>${headerRows}</tbody></table>` : ''}
</article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(collectionName)} — API Docs</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; line-height: 1.5; }
  h1 { margin-bottom: 0.25rem; }
  input[type="search"] { width: 100%; padding: 0.6rem 0.8rem; font-size: 1rem; box-sizing: border-box; margin: 1.5rem 0; border-radius: 6px; border: 1px solid #8888; }
  article.request { border: 1px solid #8884; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  article.request h3 { margin: 0 0 0.25rem; }
  .meta { opacity: 0.6; font-size: 0.85rem; margin-bottom: 0.5rem; }
  code.url { display: block; background: #8881; padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 0.9rem; overflow-wrap: anywhere; }
  .method { display: inline-block; font-weight: 700; font-size: 0.75rem; padding: 0.1rem 0.45rem; border-radius: 4px; margin-right: 0.4rem; color: #fff; vertical-align: middle; }
  .method-get { background: #2e7d32; } .method-post { background: #1565c0; } .method-put { background: #e65100; }
  .method-delete { background: #c62828; } .method-patch { background: #6a1b9a; } .method-head, .method-options { background: #616161; }
  table.headers { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.85rem; }
  table.headers th, table.headers td { text-align: left; padding: 0.25rem 0.5rem; border-bottom: 1px solid #8883; }
  .docs { margin: 0.75rem 0; }
  .collection-docs { margin-bottom: 2rem; }
</style>
</head>
<body>
<h1>${escapeHtml(collectionName)}</h1>
<div class="collection-docs">${collectionDocsHtml}</div>
<input type="search" id="search" placeholder="Search ${entries.length} request(s)&hellip;" autocomplete="off">
<div id="requests">
${entriesHtml}
</div>
<script>
  const index = ${JSON.stringify(searchIndex)};
  const search = document.getElementById('search');
  const articles = document.querySelectorAll('article.request');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    articles.forEach((el, i) => {
      el.style.display = !q || index[i].includes(q) ? '' : 'none';
    });
  });
</script>
</body>
</html>
`;
}
