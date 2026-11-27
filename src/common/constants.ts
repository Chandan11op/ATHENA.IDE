import { NovaSettings } from './types.js';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

export const DEFAULT_SETTINGS: NovaSettings = {
  mode: 'beginner',
  theme: 'dark',
  ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
  selectedModel: '',
  workspacePath: null,
  autoCheckpoint: true,
  maxRepairRetries: 3,
};

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
  /^dist$/i,
  /^build$/i,
  /^\.cache$/i,
];
