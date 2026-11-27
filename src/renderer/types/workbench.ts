export type ActivityView = 'explorer' | 'search' | 'git' | 'agents' | 'extensions';

export type BottomPanelTab = 'problems' | 'output' | 'terminal' | 'agent-logs';

export type AgentExecutionMode = 'planning' | 'fast';

export interface EditorTab {
  id: string;
  title: string;
  path: string;
  kind: 'welcome' | 'code' | 'preview';
  language?: string;
  content?: string;
}

export interface LocalAgentPreset {
  id: string;
  name: string;
  provider: string;
  modelHint: string;
  tagline: string;
  status: 'placeholder' | 'ollama-live';
}

export const OFFLINE_AGENT_PLACEHOLDERS: LocalAgentPreset[] = [
  {
    id: 'ollama-coder',
    name: 'Ollama Coder',
    provider: 'Local Ollama Runtime',
    modelHint: 'qwen2.5-coder:1.5b',
    tagline: 'Primary offline code generation & step-by-step repair agent',
    status: 'placeholder',
  },
  {
    id: 'qwen-coder-local',
    name: 'Qwen2.5 Coder (Local)',
    provider: 'Local Ollama Runtime',
    modelHint: 'qwen2.5-coder:7b',
    tagline: 'Multi-file refactoring & TypeScript reasoning specialist',
    status: 'placeholder',
  },
  {
    id: 'deepseek-coder-local',
    name: 'DeepSeek Coder Offline',
    provider: 'Local Ollama Runtime',
    modelHint: 'deepseek-coder-v2:lite',
    tagline: 'Repository architecture & debugging specialist',
    status: 'placeholder',
  },
  {
    id: 'codellama-local',
    name: 'CodeLlama Local',
    provider: 'Local Ollama Runtime',
    modelHint: 'codellama:7b',
    tagline: 'Lightweight offline completion & explanation agent',
    status: 'placeholder',
  },
  {
    id: 'custom-gguf-agent',
    name: 'Custom Offline Agent',
    provider: 'Local Endpoint / GGUF',
    modelHint: 'custom-local',
    tagline: 'Placeholder slot for user-configured local coding agents',
    status: 'placeholder',
  },
];

export const DEFAULT_EDITOR_TABS: EditorTab[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    path: 'Athena.IDE / Welcome',
    kind: 'welcome',
  },
  {
    id: 'app-tsx',
    title: 'App.tsx',
    path: 'src / renderer / App.tsx',
    kind: 'code',
    language: 'TypeScript React',
    content: [
      "import React from 'react';",
      "import { AthenaWorkbench } from './workbench';",
      '',
      'export function App() {',
      '  // Placeholder editor view — Monaco & workspace file loading arrive in Milestone 3.',
      '  return (',
      '    <AthenaWorkbench',
      '      runtime="ollama-local"',
      '      agentPreset="ollama-coder"',
      '      offlineOnly={true}',
      '    />',
      '  );',
      '}',
    ].join('\n'),
  },
  {
    id: 'preview',
    title: 'Live Preview',
    path: '127.0.0.1 / Preview',
    kind: 'preview',
  },
];

