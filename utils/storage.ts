import { type ExtensionSettings, DEFAULT_SETTINGS } from '@/types';

const STORAGE_KEY = 'settings';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}

export async function saveSettings(
  partial: Partial<ExtensionSettings>,
): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({
    [STORAGE_KEY]: { ...current, ...partial },
  });
}
