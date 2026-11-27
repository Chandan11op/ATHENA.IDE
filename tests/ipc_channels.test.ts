import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../src/common/channels.js';

describe('IPC Channel Registry (M1)', () => {
  it('defines distinct, namespaced IPC channels for all operations', () => {
    const channels = Object.values(IPC_CHANNELS);

    // All channels must start with "nova:"
    for (const channel of channels) {
      expect(channel).toMatch(/^nova:[a-z-]+:[a-z-]+$/);
    }

    // No duplicate channel names
    const uniqueChannels = new Set(channels);
    expect(uniqueChannels.size).toBe(channels.length);
  });
});
