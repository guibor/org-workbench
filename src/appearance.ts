export type Profile = 'reading' | 'nano' | 'plain';
export type Appearance = { profile: Profile; fontSize: number; lineHeight: number; width: number; tableDensity: 'compact' | 'comfortable' };
export const profiles: Record<Profile, Appearance> = {
  reading: { profile: 'reading', fontSize: 18, lineHeight: 1.7, width: 840, tableDensity: 'compact' },
  nano: { profile: 'nano', fontSize: 16, lineHeight: 1.7, width: 880, tableDensity: 'compact' },
  plain: { profile: 'plain', fontSize: 17, lineHeight: 1.6, width: 920, tableDensity: 'comfortable' },
};
export const APPEARANCE_KEY = 'org-workbench:appearance:v1';
function bounded(value: unknown, fallback: number, min: number, max: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback; }
export function validateAppearance(value: unknown): Appearance {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const profile: Profile = data.profile === 'nano' || data.profile === 'plain' ? data.profile : 'reading';
  const defaults = profiles[profile];
  return { profile, fontSize: bounded(data.fontSize, defaults.fontSize, 14, 24), lineHeight: bounded(data.lineHeight, defaults.lineHeight, 1.35, 2), width: bounded(data.width, defaults.width, 640, 1100), tableDensity: data.tableDensity === 'comfortable' || data.tableDensity === 'compact' ? data.tableDensity : defaults.tableDensity };
}
export function loadAppearance(): Appearance {
  try { return validateAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null')); } catch { return { ...profiles.reading }; }
}
export function saveAppearance(value: Appearance) {
  // Only display preferences are persisted; never a document, path, or selection.
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(validateAppearance(value))); } catch { /* Sandboxed hosts may not expose storage. */ }
}
