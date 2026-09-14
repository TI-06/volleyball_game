import type { StoredSettings } from './gameStorage';
import { loadRoot, saveRoot } from './gameStorage';

export function loadSettings(): StoredSettings {
  return loadRoot().settings;
}

export function saveSettings(settings: StoredSettings): StoredSettings {
  const root = loadRoot();
  const next = { ...root, settings };
  saveRoot(next);
  return settings;
}
