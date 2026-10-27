import { expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

it('discovers the built .org entrypoint, loads the bundled UI, and denies context-free reads', async () => {
  const client = new Client({ name: 'org-workbench-tests', version: '1' });
  const isolated = await mkdtemp(resolve(tmpdir(), 'org-runtime-'));
  try {
    await cp('dist', resolve(isolated, 'dist'), { recursive: true });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve(isolated, 'dist/server.mjs')], cwd: isolated }));
    const listed = await client.listTools();
    const tool = listed.tools.find(t => t.name === 'org_open')!;
    expect(tool._meta?.['openai/ui']).toEqual({ entrypoints: [{ type: 'file', extensions: ['.org'] }] });
    const ui = await client.readResource({ uri: 'ui://org-workbench/editor.html' });
    expect(ui.contents[0].mimeType).toBe('text/html;profile=mcp-app');
    expect('text' in ui.contents[0] ? ui.contents[0].text : '').toContain('Org Workbench');
    const read = await client.callTool({ name: 'org_read_image', arguments: { relative: '../secret.png' } });
    expect(read.isError).toBe(true);
  } finally { await client.close(); await rm(isolated, { recursive: true }); }
});
