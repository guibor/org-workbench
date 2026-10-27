import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve('docs/announcements/screenshots');
const base = process.env.ORG_WORKBENCH_PREVIEW_URL || 'http://127.0.0.1:4318';
const source = await readFile('examples/field-notes.org', 'utf8');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const shots = [];
await mkdir(output, { recursive: true });

async function capture(name, caption, alt) {
  await page.evaluate(() => document.fonts.ready);
  const viewport = page.viewportSize();
  await page.mouse.move(viewport.width - 10, viewport.height - 10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bytes = await page.screenshot({ path: resolve(output, name), animations: 'disabled' });
  shots.push({ file: name, caption, alt, width: viewport.width * 2, height: viewport.height * 2, sha256: createHash('sha256').update(bytes).digest('hex') });
}

async function goToHeading(name) {
  await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
  await page.getByRole('heading', { name: new RegExp(name) }).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  if (await page.getByRole('textbox', { name: 'Org source' }).isVisible()) {
    await expect(page.locator('.cm-activeLine')).toContainText(name);
    await page.locator('.cm-activeLine').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
}

try {
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'A quieter place to think' })).toBeVisible();
  await capture('01-reading.png', 'Rendered Org with a folding outline, tasks, and reading typography.', 'Org Workbench reading view, showing an outline on the left and the public field-notes.org document on the right.');

  await goToHeading('Make space for focused work');
  await expect(page.getByRole('cell', { name: 'Notifications on' })).toBeVisible();
  await capture('02-tables.png', 'Tasks and a table remain part of the same .org document.', 'Org Workbench showing a task checklist and a four-column table with aligned numeric values.');

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await goToHeading('A small experiment');
  await expect(page.getByRole('textbox', { name: 'Org source' })).toBeVisible();
  await capture('03-split.png', 'Org source and the rendered table side by side.', 'Split view with the original Org table syntax on the left and its rendered table on the right.');

  await page.getByRole('cell', { name: 'Notifications on' }).click();
  await page.getByRole('textbox', { name: 'Edit table cell' }).fill('Quiet morning');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Quiet morning' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Org source' })).toContainText('Quiet morning');
  await goToHeading('A small experiment');
  await capture('04-editing.png', 'Editing a rendered table cell changes the original source; undo is shared.', 'After changing a table cell to Quiet morning, the same text is visible in the Org source and rendered table. The status bar shows unsaved changes.');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Notifications on' })).toBeVisible();

  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.locator('.reading-pane').evaluate(element => { element.scrollTop = 0; });
  await page.getByRole('button', { name: 'Reading appearance', exact: true }).click();
  await page.getByLabel('Profile', { exact: true }).selectOption('nano');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await capture('05-nano-dark.png', 'Optional Nano-inspired typography in dark mode.', 'Org Workbench in dark mode with the Nano-inspired monospaced reading profile and the outline visible.');
  await page.getByRole('button', { name: 'Reading appearance', exact: true }).click();
  await capture('06-appearance.png', 'Reading controls: profile, text size, spacing, width, and table density.', 'The Reading appearance dialog, with Nano-inspired selected and controls for text size, line height, page width, and table density.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download copy' }).click();
  expect(await readFile((await (await downloading).path()), 'utf8')).toBe(source);
  expect(errors).toEqual([]);
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({
    source: 'examples/field-notes.org', sourceSha256: createHash('sha256').update(source).digest('hex'),
    interface: 'Unmodified Org Workbench 0.2.0 browser build; same React renderer used by the Codex plugin. These are not full Codex application captures.',
    editing: 'Screenshots are direct browser captures. No UI, save state, or host chrome has been composited or hidden.',
    screenshots: shots,
  }, null, 2) + '\n');
  console.log(`Captured ${shots.length} screenshots. Public fixture unchanged after editing and undo.`);
} finally {
  await context.close();
  await browser.close();
}
