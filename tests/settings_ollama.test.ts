import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SettingsManager } from '../src/main/settings.js';
import { checkOllamaAvailability } from '../src/main/ollama.js';
import { DEFAULT_SETTINGS } from '../src/common/constants.js';

describe('Settings & Local Ollama Availability (M1)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('loads default settings when no config file exists', () => {
    const settingsManager = new SettingsManager(tempDir);
    const allSettings = settingsManager.getAll();

    expect(allSettings.mode).toBe('beginner');
    expect(allSettings.theme).toBe('dark');
    expect(allSettings.ollamaEndpoint).toBe(DEFAULT_SETTINGS.ollamaEndpoint);
    expect(allSettings.maxRepairRetries).toBe(3);
  });

  it('updates and persists settings values', () => {
    const settingsManager = new SettingsManager(tempDir);
    
    const updateSuccess = settingsManager.set('mode', 'developer');
    expect(updateSuccess).toBe(true);
    expect(settingsManager.get('mode')).toBe('developer');

    settingsManager.set('theme', 'light');
    expect(settingsManager.get('theme')).toBe('light');

    // Verify it re-reads persisted settings from disk
    const reloadedManager = new SettingsManager(tempDir);
    expect(reloadedManager.get('theme')).toBe('light');
    expect(reloadedManager.get('mode')).toBe('developer');
  });

  it('handles offline or unreachable Ollama gracefully without crashing', async () => {
    // Testing unallocated high local port to simulate offline runtime
    const offlineEndpoint = 'http://127.0.0.1:54321';
    const status = await checkOllamaAvailability(offlineEndpoint, 800);

    expect(status.isAvailable).toBe(false);
    expect(status.endpoint).toBe(offlineEndpoint);
    expect(status.models).toHaveLength(0);
    expect(status.errorMessage).toBeDefined();
    expect(typeof status.errorMessage).toBe('string');
  });

  it('handles invalid endpoint URL strings gracefully', async () => {
    const invalidEndpoint = 'not-a-valid-url';
    const status = await checkOllamaAvailability(invalidEndpoint, 500);

    expect(status.isAvailable).toBe(false);
    expect(status.models).toHaveLength(0);
    expect(status.errorMessage).toBeDefined();
  });
});
