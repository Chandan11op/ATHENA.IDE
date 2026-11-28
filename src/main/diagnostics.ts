import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import {
  AthenaSettings,
  HardwareAssessment,
  OfflineReadinessReport,
  OfflineReadinessState,
  ReadinessCheckItem,
} from '../common/types.js';
import { AthenaDataManager } from './athenaData.js';
import { KnowledgeService } from './knowledge.js';
import { inspectOllamaEnvironment } from './ollama.js';

function detectGpuSafe(): Promise<{ gpuInfo: string | null; gpuUncertain: boolean }> {
  if (process.platform !== 'win32') {
    return Promise.resolve({ gpuInfo: null, gpuUncertain: true });
  }
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join "; "',
      ],
      { timeout: 3000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve({ gpuInfo: null, gpuUncertain: true });
        } else {
          resolve({ gpuInfo: stdout.trim(), gpuUncertain: false });
        }
      }
    );
  });
}

export async function assessHardware(dataDir: string): Promise<HardwareAssessment> {
  const cpus = os.cpus();
  const { gpuInfo, gpuUncertain } = await detectGpuSafe();

  let diskFreeBytes: number | null = null;
  let diskTotalBytes: number | null = null;
  try {
    if (typeof fs.statfsSync === 'function') {
      const stat = fs.statfsSync(dataDir);
      diskFreeBytes = stat.bavail * stat.bsize;
      diskTotalBytes = stat.blocks * stat.bsize;
    }
  } catch {
    diskFreeBytes = null;
    diskTotalBytes = null;
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    totalRamBytes: os.totalmem(),
    freeRamBytes: os.freemem(),
    cpuModel: cpus[0]?.model ?? 'Unknown CPU',
    cpuCores: cpus.length,
    gpuInfo,
    gpuUncertain,
    diskFreeBytes,
    diskTotalBytes,
  };
}

export async function runReadinessDiagnostics(
  dataManager: AthenaDataManager,
  settings: AthenaSettings,
  knowledgeService: KnowledgeService
): Promise<OfflineReadinessReport> {
  const checkedAt = new Date().toISOString();
  const dataInit = dataManager.initAndVerifyDataDir(settings);
  const setupState = dataManager.getSetupState();
  const env = await inspectOllamaEnvironment(settings.ollamaEndpoint);
  const workspaceExists = Boolean(
    settings.workspacePath && fs.existsSync(settings.workspacePath)
  );
  const conversations = dataManager.listConversations();
  const kbSources = knowledgeService.listSources();

  const selectedModel = settings.selectedModel || env.models[0]?.name || '';
  const modelPresent = Boolean(
    selectedModel && env.models.some((m) => m.name === selectedModel)
  );
  const modelVerified = Boolean(
    setupState.modelVerified.status === 'verified' &&
      setupState.modelVerified.modelId === selectedModel &&
      modelPresent
  );

  const checks: ReadinessCheckItem[] = [
    {
      id: 'data-dir',
      label: 'athena.data Directory & Write Permissions',
      status: dataInit.ok && dataInit.writable ? 'passed' : 'failed',
      detail: dataInit.ok
        ? `Writable at ${dataInit.rootDir}`
        : dataInit.error || 'Directory initialization failed',
    },
    {
      id: 'settings-persist',
      label: 'Settings & Setup State Persistence',
      status: setupState.dataDirInitialized.status === 'done' ? 'passed' : 'failed',
      detail: `Schema v${setupState.schemaVersion} persisted`,
    },
    {
      id: 'ollama-install',
      label: 'Ollama Runtime Installed',
      status: env.installed ? 'passed' : 'requires_setup',
      detail: env.executablePath
        ? `${env.executablePath}${env.executableVersion ? ` (${env.executableVersion})` : ''}`
        : env.apiReachable
        ? 'API reachable (executable path external)'
        : 'Ollama executable not detected on system',
    },
    {
      id: 'ollama-api',
      label: 'Ollama Service & Loopback API',
      status: env.apiReachable ? 'passed' : env.installed ? 'failed' : 'requires_setup',
      detail: env.apiReachable
        ? `Connected at ${env.endpoint} (${env.models.length} model(s))`
        : env.error || 'Service unreachable',
    },
    {
      id: 'model-available',
      label: 'Local Coding Model Installed',
      status: modelPresent ? 'passed' : env.apiReachable ? 'requires_setup' : 'not_tested',
      detail: modelPresent
        ? `Model "${selectedModel}" detected`
        : 'No compatible coding model selected or installed',
    },
    {
      id: 'model-verified',
      label: 'Model Inference Verified',
      status: modelVerified
        ? 'passed'
        : modelPresent
        ? 'requires_setup'
        : 'not_tested',
      detail: modelVerified
        ? `Verified (${setupState.modelVerified.testLatencyMs ?? '?'}ms): ${setupState.modelVerified.sampleOutput ?? 'OK'}`
        : 'Run verification test in Setup Wizard to confirm live inference',
    },
    {
      id: 'workspace',
      label: 'Local Workspace & File Operations',
      status: workspaceExists ? 'passed' : 'requires_setup',
      detail: workspaceExists
        ? `Active workspace: ${settings.workspacePath}`
        : 'Open a local folder to test workspace operations',
    },
    {
      id: 'knowledge',
      label: 'Local Knowledge Index',
      status: kbSources.length > 0 ? 'passed' : 'requires_setup',
      detail:
        kbSources.length > 0
          ? `${kbSources.length} indexed source(s)`
          : 'No knowledge resources indexed yet',
    },
    {
      id: 'conversations',
      label: 'Conversation Persistence',
      status: conversations.length > 0 ? 'passed' : 'not_tested',
      detail:
        conversations.length > 0
          ? `${conversations.length} saved local thread(s)`
          : 'Send a prompt in Athena AI to verify thread persistence',
    },
    {
      id: 'offline-disconnect',
      label: 'Disconnected Network Verification',
      status: 'not_tested',
      detail:
        'Manual verification required with Wi-Fi/Ethernet disconnected (see docs/OFFLINE_TEST_PLAN.md)',
    },
  ];

  let state: OfflineReadinessState;
  let summary: string;

  if (!dataInit.ok) {
    state = 'degraded';
    summary = `athena.data error: ${dataInit.error}`;
  } else if (!env.installed) {
    state = setupState.skippedAiSetup ? 'setup_required' : 'not_configured';
    summary = 'Ollama is not installed. Run the Setup Wizard to install or configure Ollama.';
  } else if (!env.apiReachable) {
    state = 'runtime_unavailable';
    summary = 'Ollama is installed, but the local service is not running at 127.0.0.1:11434.';
  } else if (!modelPresent) {
    state = 'model_unavailable';
    summary = 'Ollama is running, but no local coding model is installed or selected.';
  } else if (!modelVerified) {
    state = 'model_verification_pending';
    summary = `Model "${selectedModel}" is installed but has not yet passed an inference check.`;
  } else if (!workspaceExists) {
    state = 'ai_operational';
    summary = `Local AI ("${selectedModel}") is verified operational. Open a workspace folder for full offline IDE readiness.`;
  } else {
    state = 'offline_ready';
    summary = `Verified local AI ("${selectedModel}"), athena.data, and workspace are ready for offline coding.`;
  }

  return { state, checkedAt, checks, summary };
}
