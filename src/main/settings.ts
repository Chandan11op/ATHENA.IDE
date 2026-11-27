import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { NovaSettings } from '../common/types.js';
import { DEFAULT_SETTINGS } from '../common/constants.js';

export class SettingsManager {
  private configPath: string;
  private settings: NovaSettings;

  constructor(customDataDir?: string) {
    const userDataDir = customDataDir || (app ? app.getPath('userData') : path.resolve(process.cwd(), '.nova-data'));
    if (!fs.existsSync(userDataDir)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create userData directory:', err);
      }
    }
    this.configPath = path.join(userDataDir, 'nova-settings.json');
    this.settings = this.load();
  }

  private load(): NovaSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn('[Settings] Failed to load settings file, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  public getAll(): NovaSettings {
    return { ...this.settings };
  }

  public get<K extends keyof NovaSettings>(key: K): NovaSettings[K] {
    return this.settings[key];
  }

  public set<K extends keyof NovaSettings>(key: K, value: NovaSettings[K]): boolean {
    this.settings[key] = value;
    return this.save();
  }

  public update(partial: Partial<NovaSettings>): boolean {
    this.settings = { ...this.settings, ...partial };
    return this.save();
  }

  private save(): boolean {
    try {
      // Atomic write: write to temp file then rename
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
