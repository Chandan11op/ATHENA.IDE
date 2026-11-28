import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AthenaSettings } from '../common/types.js';
import { DEFAULT_SETTINGS } from '../common/constants.js';
import { AthenaDataManager } from './athenaData.js';

export class SettingsManager {
  private configPath: string;
  private legacyConfigPath: string | null = null;
  private settings: AthenaSettings;

  constructor(customDataDir?: string, dataManager?: AthenaDataManager) {
    let settingsDir: string;
    if (dataManager) {
      settingsDir = dataManager.getSubdir('settings');
    } else if (customDataDir) {
      settingsDir = customDataDir;
    } else if (app && typeof app.getPath === 'function') {
      const userData = app.getPath('userData');
      settingsDir = path.join(userData, 'athena.data', 'settings');
      this.legacyConfigPath = path.join(userData, 'nova-settings.json');
    } else {
      settingsDir = path.resolve(process.cwd(), 'athena.data', 'settings');
    }

    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    this.configPath = path.join(settingsDir, 'settings.json');
    if (customDataDir && !dataManager) {
      // Backwards compatible path when unit tests pass custom temp dir
      const legacyInCustom = path.join(customDataDir, 'nova-settings.json');
      if (fs.existsSync(legacyInCustom) && !fs.existsSync(this.configPath)) {
        this.legacyConfigPath = legacyInCustom;
      }
    }

    this.settings = this.load();
  }

  private load(): AthenaSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      if (this.legacyConfigPath && fs.existsSync(this.legacyConfigPath)) {
        const raw = fs.readFileSync(this.legacyConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        const migrated = { ...DEFAULT_SETTINGS, ...parsed };
        this.settings = migrated;
        this.save();
        return migrated;
      }
    } catch (err) {
      console.warn('[Settings] Failed to load settings file, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  public getAll(): AthenaSettings {
    return { ...this.settings };
  }

  public get<K extends keyof AthenaSettings>(key: K): AthenaSettings[K] {
    return this.settings[key];
  }

  public set<K extends keyof AthenaSettings>(key: K, value: AthenaSettings[K]): boolean {
    this.settings[key] = value;
    return this.save();
  }

  public update(partial: Partial<AthenaSettings>): boolean {
    this.settings = { ...this.settings, ...partial };
    return this.save();
  }

  private save(): boolean {
    try {
      const tempPath = `${this.configPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.settings, null, 2), 'utf8');
      fs.renameSync(tempPath, this.configPath);
      return true;
    } catch (err) {
      console.error('[Settings] Failed to save settings to disk:', err);
      return false;
    }
  }
}
