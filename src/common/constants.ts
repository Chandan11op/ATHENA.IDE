import { AthenaSettings, RecommendedModel } from './types.js';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

export const DEFAULT_SETTINGS: AthenaSettings = {
  mode: 'beginner',
  theme: 'dark',
  ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
  selectedModel: '',
  workspacePath: null,
  autoCheckpoint: true,
  maxRepairRetries: 3,
  editorFontSize: 13,
  editorFontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
  editorWordWrap: false,
  customDataDir: null,
  recentWorkspaces: [],
};

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    id: 'qwen2.5-coder:1.5b',
    name: 'Qwen2.5-Coder 1.5B',
    family: 'qwen2.5-coder',
    sizeApprox: '~1.0 GB',
    minRamGb: 4,
    contextWindow: '32K',
    capabilities: ['completion', 'chat', 'beginner-friendly'],
    notes: 'Fast lightweight coding model suitable for 4-8 GB RAM laptops.',
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen2.5-Coder 7B',
    family: 'qwen2.5-coder',
    sizeApprox: '~4.7 GB',
    minRamGb: 16,
    contextWindow: '32K',
    capabilities: ['completion', 'chat', 'refactoring'],
    notes: 'Balanced code generation & refactoring; requires 16 GB RAM or 6+ GB VRAM.',
  },
  {
    id: 'deepseek-coder-v2:lite',
    name: 'DeepSeek-Coder-V2 Lite',
    family: 'deepseek-coder',
    sizeApprox: '~8.9 GB',
    minRamGb: 16,
    contextWindow: '32K',
    capabilities: ['chat', 'debugging', 'architecture'],
    notes: 'Strong multi-file reasoning on 16+ GB RAM systems.',
  },
  {
    id: 'codegemma:2b',
    name: 'CodeGemma 2B',
    family: 'gemma',
    sizeApprox: '~1.6 GB',
    minRamGb: 8,
    contextWindow: '8K',
    capabilities: ['completion'],
    notes: 'Compact fill-in-the-middle completion model.',
  },
  {
    id: 'qwen3-coder:30b',
    name: 'Qwen3-Coder 30B (High-RAM)',
    family: 'qwen3-coder',
    sizeApprox: '~18+ GB',
    minRamGb: 32,
    contextWindow: '64K',
    capabilities: ['chat', 'refactoring', 'agent'],
    notes: 'Workstation/high-VRAM model only; check availability in Ollama registry.',
  },
];

export const SENSITIVE_FILE_PATTERNS = [
  /^\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /\.id_rsa$/i,
  /\.id_ed25519$/i,
  /id_rsa/i,
  /credentials\.json$/i,
  /\.npmrc$/i,
  /\.gitconfig$/i,
  /\.passwd$/i,
];

export const EXCLUDED_DIR_PATTERNS = [
  /^\.git$/i,
  /^node_modules$/i,
  /^\.nova-checkpoints$/i,
  /^\.athena-checkpoints$/i,
  /^athena\.data$/i,
  /^dist$/i,
  /^build$/i,
  /^\.cache$/i,
];
