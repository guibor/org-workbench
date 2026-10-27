import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions, OpenAIFileEntrypointInputSchema } from '@openai/mcp-extensions/app';
import type { FileAdapter, Snapshot } from './document';
import { MAX_BYTES } from './org';
import { version } from '../package.json';

export async function connectHost(open: (adapter: FileAdapter) => void, fail: (error: string) => void) {
  const app = new App({ name: 'Org Workbench', version });
  const extensions = new OpenAIExtensions(app);
  function theme() {
    const context = app.getHostContext();
    if (context?.theme) applyDocumentTheme(context.theme);
    if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
    const insets = context?.safeAreaInsets;
    if (insets) for (const side of ['top', 'right', 'bottom', 'left'] as const) document.documentElement.style.setProperty(`--safe-${side}`, `${insets[side]}px`);
  }
  app.addEventListener('hostcontextchanged', theme);
  app.ontoolresult = () => {};
  app.addEventListener('toolinput', ({ arguments: args }) => {
    const input = OpenAIFileEntrypointInputSchema.safeParse(args);
    if (!input.success) return;
    const { name, resourceUri } = input.data.file;
    const resources = extensions.resources;
    if (!resources) { fail('This host does not support file resources. Update Codex, or use the browser edition.'); return; }
    const adapter: FileAdapter = {
      name,
      async read(): Promise<Snapshot> {
        const result = await resources.read({ uri: resourceUri, representation: 'text' });
        const content = result.contents[0];
        if (!content) throw new Error('The host returned an empty resource.');
        const text = 'text' in content ? content.text : new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(content.blob), c => c.charCodeAt(0)));
        return { text, etag: content.openaiMetadata?.etag, writable: content.openaiMetadata?.writable === true };
      },
      write: (text, etag) => resources.write(resourceUri, { text, ifMatch: etag }),
      async export(text) {
        const result = await app.downloadFile({ contents: [{ type: 'resource', resource: { uri: `file:///${encodeURIComponent(name)}`, mimeType: 'text/org', text } }] });
        if (result.isError) throw new Error('The host declined the download. Your edits are still in this tab.');
      },
      async subscribe(update) {
        const off = resources.addUpdateHandler(({ params }) => { if (params.uri === resourceUri) update(); });
        try { await resources.subscribe({ uri: resourceUri }); }
        catch { /* Some hosts expose reads/writes but no subscriptions. Focus refresh remains available. */ }
        return () => { off(); void resources.unsubscribe({ uri: resourceUri }).catch(() => {}); };
      },
      async image(relative) {
        const result = await app.callServerTool({ name: 'org_read_image', arguments: { relative } });
        if (result.isError || typeof result.structuredContent?.dataUrl !== 'string') throw new Error('Image unavailable or outside the document folder.');
        return result.structuredContent.dataUrl;
      },
      async openLink(target) {
        if (/^https?:|^mailto:/i.test(target)) { await app.openLink({ url: target }); return; }
        const result = await app.callServerTool({ name: 'org_resolve_link', arguments: { relative: target.replace(/^file:/, '') } });
        if (result.isError || typeof result.structuredContent?.path !== 'string' || !extensions.files) throw new Error('This local link cannot be opened.');
        await extensions.files.open(result.structuredContent.path);
      },
    };
    open(adapter);
  });
  await app.connect();
  theme();
  return app;
}

export function download(source: string, name: string) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/org;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function browserFile(file: File): Promise<FileAdapter> {
  if (file.size > MAX_BYTES) throw new Error('This version supports Org files up to 1 MiB.');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  return { name: file.name, read: async () => ({ text: source, writable: false }) };
}
