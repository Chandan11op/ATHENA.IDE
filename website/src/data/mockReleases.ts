import { Release } from '@/types/release';

/**
 * Local development baseline reflecting the actual repository state (`package.json` v0.1.0).
 * Downloadable installer assets remain empty (`assets: []`) until the backend release service
 * (branch `ansh-dev`) supplies verified build artifacts. No synthetic download URLs are invented.
 */
export const MOCK_RELEASES: Release[] = [
  {
    id: 'rel-0.1.0',
    version: '0.1.0',
    tag: 'v0.1.0',
    title: 'ATHENA.IDE v0.1.0 — Secure Desktop Shell (Prototype)',
    description:
      'Initial Electron, React 19, TypeScript, and Vite desktop shell with local Ollama detection, workspace path sandboxing, and Beginner/Developer modes.',
    releaseDate: '2026-11-20T00:00:00.000Z',
    releaseNotes:
      'Establishes the M0/M1 desktop foundation: hardened Electron context isolation, secure preload IPC bridge, sensitive file protection, dark/light themes, and local Ollama availability checks at http://127.0.0.1:11434.',
    changelog: {
      newFeatures: [
        'Hardened Electron main process with context isolation and secure preload bridge.',
        'Local Ollama runtime detection (http://127.0.0.1:11434) with offline onboarding guidance.',
        'Beginner Mode and Developer Mode switching with persistent settings.',
        'Native workspace directory picker with path sandboxing and sensitive file pattern exclusions.',
      ],
      improvements: [
        'Dark and light theme synchronization across desktop shell components.',
        'System metrics inspection and automated security/integration test suite via Vitest.',
      ],
      bugFixes: [],
    },
    releaseChannel: 'alpha',
    isPrerelease: true,
    compatibility: {
      osRequirements: {
        windows: 'Windows 10 / 11 (64-bit) — primary MVP target',
        macos: null,
        linux: null,
      },
      minRamGb: 8,
      recommendedRamGb: 16,
      ollamaRequired: true,
      recommendedModels: ['qwen2.5-coder:1.5b'],
    },
    assets: [],
  },
];
