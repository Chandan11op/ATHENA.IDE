import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../src/common/channels.js';

describe('IPC Channel Registry', () => {
  it('defines distinct, namespaced IPC channels for all operations', () => {
    const channels = Object.values(IPC_CHANNELS);

    for (const channel of channels) {
      expect(channel).toMatch(/^athena:[a-z-]+:[a-z-]+$/);
    }

    const uniqueChannels = new Set(channels);
    expect(uniqueChannels.size).toBe(channels.length);
  });
});
