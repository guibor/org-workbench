import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('rendered edits, source, undo, table editing, and download preserve Org', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A quieter place to think' })).toBeVisible();
  await page.getByRole('button', { name: 'Change status: Make space for focused work' }).click();
  await expect(page.getByRole('button', { name: 'Change status: Make space for focused work' })).toHaveText('WAITING');
  await page.getByRole('checkbox', { name: 'Choose the question worth answering' }).click();
  await expect(page.getByRole('checkbox', { name: 'Choose the question worth answering' })).toBeChecked();
  const checkboxLayout = await page.getByRole('checkbox', { name: 'Choose the question worth answering' }).evaluate(el => {
    const input = el.getBoundingClientRect(); const text = el.nextElementSibling!.getBoundingClientRect();
    return { inline: Math.abs(input.top - text.top) < 15, noBullet: getComputedStyle(el.parentElement!).listStyleType === 'none' };
  });
  expect(checkboxLayout).toEqual({ inline: true, noBullet: true });
  await page.getByRole('cell', { name: 'Notifications on' }).click();
  await page.getByRole('textbox', { name: 'Edit table cell' }).fill('Quiet morning');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Quiet morning' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Notifications on' })).toBeVisible();
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Org source' })).toContainText('* WAITING Make space');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download copy' }).click();
  const file = await download;
  const content = await readFile((await file.path())!, 'utf8');
  expect(content).toContain('- [X] Choose the question worth answering');
  expect(content).toContain(':CUSTOM_ID: notebook');
  expect(content).toContain('#+begin_src python');
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await page.locator('.reading-pane').evaluate(el => el.scrollTop = 0);
  await page.screenshot({ path: testInfo.outputPath('reading.png'), fullPage: true });
  await page.getByRole('cell', { name: 'Notifications on' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('tables.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('import preserves CRLF through a source edit and does not execute raw HTML', async ({ page }) => {
  await page.goto('/');
  const original = '#+title: Windows notes\r\n* TODO שלום\r\n- [ ] Next\r\n#+HTML: <script>window.pwned=true</script>\r\n';
  await page.locator('input[type=file]').setInputFiles({ name: 'windows.org', mimeType: 'text/plain', buffer: Buffer.from(original) });
  await expect(page.getByRole('heading', { name: 'Windows notes' })).toBeVisible();
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Org source' });
  await editor.click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.type('Tail');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download copy' }).click();
  const content = await readFile((await (await pending).path())!, 'utf8');
  expect(content.replaceAll('\r\n', '')).not.toContain('\n');
  expect(content).toContain('Tail');
  expect(await page.evaluate(() => (window as unknown as { pwned?: boolean }).pwned)).toBeUndefined();
});

test('split view, folding, outline filtering, dark theme, and narrow tables', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Org source' })).toBeVisible();
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('split-dark.png') });
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  const fold = page.getByRole('button', { name: 'Collapse section', exact: true }).first();
  await fold.click(); await expect(page.getByText('Good notes leave room', { exact: false })).toBeHidden();
  await page.getByRole('button', { name: 'Expand section', exact: true }).first().click();
  if (!await page.getByRole('textbox', { name: 'Filter outline' }).isVisible()) await page.getByRole('button', { name: 'Toggle outline' }).click();
  await page.getByRole('textbox', { name: 'Filter outline' }).fill('experiment');
  await expect(page.getByRole('navigation').getByRole('button')).toHaveCount(1);
  await page.getByRole('navigation').getByRole('button').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('MCP host resource lifecycle: read, conditional save, refresh, and conflict', async ({ page }) => {
  await page.goto('/tests/host.html?production=1');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Host document' })).toBeVisible();
  await frame.getByRole('button', { name: 'Change status: First task' }).click();
  await frame.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(frame.getByText('Saved', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).disk.text)).toContain('* DONE First task');
  expect(await page.evaluate(() => (window as any).lastMatch)).toBe('v1');
  await frame.getByRole('button', { name: 'Download copy' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).exported)).toContain('* DONE First task');
  await frame.getByRole('button', { name: 'Change status: First task' }).click();
  await page.evaluate(() => (window as any).externalChange());
  await expect(frame.getByRole('alert')).toContainText('file changed outside');
  await expect(frame.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).disk.text)).toContain('External content');
});
