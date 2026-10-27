import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { readImage, scopedPath } from './files';
import { version } from '../package.json';

const URI = 'ui://org-workbench/editor.html';
const server = new McpServer({ name: 'org-workbench', version });
registerAppResource(server, 'Org Workbench', URI, {}, async () => ({ contents: [{
  uri: URI, mimeType: RESOURCE_MIME_TYPE,
  text: await readFile(new URL('./ui/index.html', import.meta.url), 'utf8'),
  _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } }, 'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['fullscreen'] } },
}] }));
registerAppTool(server, 'org_open', {
  title: 'Org Workbench', description: 'Open an Org document in the source-preserving Org Workbench editor. Invoked by the .org file handler.',
  inputSchema: { file: z.object({ name: z.string(), resourceUri: z.string() }) },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: URI, visibility: ['app'] }, 'openai/ui': { entrypoints: [{ type: 'file', extensions: ['.org'] }] } },
}, async ({ file }) => ({ content: [], structuredContent: { name: file.name } }));

for (const [name, description] of [['org_read_image', 'Read a raster image relative to the opened Org document.'], ['org_resolve_link', 'Resolve a file link within the opened Org document directory.']] as const) {
  registerAppTool(server, name, {
    description, inputSchema: { relative: z.string().min(1).max(4096) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ relative }, extra) => {
    const meta = extra._meta?.['openai/resource'] as { path?: string } | undefined;
    try {
      const data = name === 'org_read_image' ? { dataUrl: await readImage(meta?.path, relative) } : { path: await scopedPath(meta?.path, relative) };
      return { content: [], structuredContent: data };
    } catch { return { isError: true, content: [{ type: 'text', text: 'Cannot access this file within the opened document folder.' }] }; }
  });
}
await server.connect(new StdioServerTransport());
