import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import { RECOMMENDED_MODELS } from '@common/constants.js';
import {
  AthenaSettings,
  AthenaSetupState,
  DataInitReport,
  HardwareAssessment,
  ModelVerificationResult,
  OfflineReadinessReport,
  OllamaEnvironmentStatus,
  OllamaStatus,
} from '@common/types.js';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ollamaStatus: OllamaStatus | null;
  settings: AthenaSettings;
  onRefresh: () => Promise<void>;
  onSelectModel: (model: string) => Promise<void>;
  onSetupStateChanged?: (state: AthenaSetupState) => void;
}

type WizardTab = 'setup' | 'diagnostics';

const READINESS_LABELS: Record<string, string> = {
  not_configured: 'Not Configured',
  setup_required: 'Setup Required',
  runtime_unavailable: 'Runtime Unavailable',
  model_unavailable: 'Model Unavailable',
  model_downloading: 'Model Downloading',
  model_verification_pending: 'Model Verification Pending',
  ai_operational: 'AI Operational',
  offline_ready: 'Offline-Ready (Verified Capabilities)',
  degraded: 'Degraded State',
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  ollamaStatus,
  settings,
  onRefresh,
  onSelectModel,
  onSetupStateChanged,
}) => {
  const [tab, setTab] = useState<WizardTab>('setup');
  const [hardware, setHardware] = useState<HardwareAssessment | null>(null);
  const [dataReport, setDataReport] = useState<DataInitReport | null>(null);
  const [setupState, setSetupState] = useState<AthenaSetupState | null>(null);
  const [envStatus, setEnvStatus] = useState<OllamaEnvironmentStatus | null>(null);
  const [readiness, setReadiness] = useState<OfflineReadinessReport | null>(null);

  const [installLogs, setInstallLogs] = useState<string>('');
  const [installingOllama, setInstallingOllama] = useState(false);
  const [startingRuntime, setStartingRuntime] = useState(false);

  const [targetPullModel, setTargetPullModel] = useState('qwen2.5-coder:1.5b');
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [pullStatusText, setPullStatusText] = useState<string | null>(null);
  const [pullPercent, setPullPercent] = useState<number | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ModelVerificationResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runFullInspection = async () => {
    if (!window.athenaApi) return;
    setActionError(null);
    const [hw, dInit, sState, oEnv, diag] = await Promise.all([
      window.athenaApi.assessHardware(),
      window.athenaApi.initAndVerifyDataDir(),
      window.athenaApi.getSetupState(),
      window.athenaApi.inspectOllamaEnvironment(settings.ollamaEndpoint),
      window.athenaApi.runReadinessDiagnostics(),
    ]);
    setHardware(hw);
    setDataReport(dInit);
    setSetupState(sState);
    setEnvStatus(oEnv);
    setReadiness(diag);
    onSetupStateChanged?.(sState);
  };

  useEffect(() => {
    if (isOpen) {
      void runFullInspection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!window.athenaApi) return;
    const unsubInstall = window.athenaApi.onOllamaInstallLog((line) => {
      setInstallLogs((prev) => (prev + line).slice(-4000));
    });
    const unsubPull = window.athenaApi.onOllamaPullProgress((ev) => {
      if (ev.error) {
        setPullStatusText(`Download failed: ${ev.error}`);
        setDownloadingModel(false);
      } else if (ev.done) {
        setPullStatusText(`Completed download for ${ev.model}`);
        setPullPercent(100);
        setDownloadingModel(false);
        void onSelectModel(ev.model).then(() => onRefresh()).then(() => runFullInspection());
      } else if (ev.total && ev.completed) {
        const pct = Math.min(100, Math.round((ev.completed / ev.total) * 100));
        setPullPercent(pct);
        setPullStatusText(`${ev.status} — ${pct}%`);
      } else {
        setPullStatusText(ev.status);
      }
    });
    return () => {
      unsubInstall();
      unsubPull();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) return null;

  const totalRamGb = hardware
    ? (hardware.totalRamBytes / (1024 * 1024 * 1024)).toFixed(1)
    : '?';
  const diskFreeGb =
    hardware?.diskFreeBytes != null
      ? (hardware.diskFreeBytes / (1024 * 1024 * 1024)).toFixed(1)
      : 'Unavailable';

  const activeModel =
    settings.selectedModel || envStatus?.models[0]?.name || ollamaStatus?.models[0]?.name || '';

  const handleInstallWinget = async () => {
    if (!window.athenaApi) return;
    const approved = window.confirm(
      'Install Ollama using Windows Package Manager (winget install -e --id Ollama.Ollama)? Internet access is required for installation.'
    );
    if (!approved) return;
    setActionError(null);
    setInstallLogs('');
    setInstallingOllama(true);
    const res = await window.athenaApi.installOllamaViaWinget();
    setInstallingOllama(false);
    if (!res.ok) {
      setActionError(res.error ?? 'Ollama installation failed');
    } else {
      await handleStartRuntime();
    }
    await runFullInspection();
  };

  const handleStartRuntime = async () => {
    if (!window.athenaApi) return;
    setActionError(null);
    setStartingRuntime(true);
    const res = await window.athenaApi.startOllamaRuntime(settings.ollamaEndpoint);
    setStartingRuntime(false);
    if (!res.ok) {
      setActionError(res.error ?? 'Unable to start Ollama service');
    }
    await onRefresh();
    await runFullInspection();
  };

  const handleDownloadModel = async () => {
    if (!window.athenaApi || !targetPullModel.trim()) return;
    const spec = RECOMMENDED_MODELS.find((m) => m.id === targetPullModel);
    const sizeNote = spec ? ` (${spec.sizeApprox}, ${spec.minRamGb}GB+ RAM recommended)` : '';
    const approved = window.confirm(
      `Download local model "${targetPullModel}"${sizeNote} via Ollama? Internet access is required during download.`
    );
    if (!approved) return;

    setActionError(null);
    setVerifyResult(null);
    setPullPercent(0);
    setPullStatusText(`Requesting download for ${targetPullModel}...`);
    setDownloadingModel(true);
    const res = await window.athenaApi.pullOllamaModel(targetPullModel, settings.ollamaEndpoint);
    setDownloadingModel(false);
    if (!res.ok && res.error) {
      setActionError(res.error);
    }
  };

  const handleVerifyModel = async () => {
    if (!window.athenaApi || !activeModel) return;
    setActionError(null);
    setVerifying(true);
    const res = await window.athenaApi.verifyOllamaModel(activeModel, settings.ollamaEndpoint);
    setVerifying(false);
    setVerifyResult(res);
    await onRefresh();
    await runFullInspection();
  };

  const handleSkipAi = async () => {
    if (window.athenaApi) {
      const updated = await window.athenaApi.updateSetupState({ skippedAiSetup: true });
      setSetupState(updated);
      onSetupStateChanged?.(updated);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-label="Athena.IDE Offline AI Setup & Readiness Wizard"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          width: 720,
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>
              Athena.IDE Offline AI Setup &amp; Readiness
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Status:{' '}
              <strong style={{ color: readiness?.state === 'offline_ready' || readiness?.state === 'ai_operational' ? 'var(--success)' : 'var(--warning)' }}>
                {readiness ? READINESS_LABELS[readiness.state] ?? readiness.state : 'Inspecting...'}
              </strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={tab === 'setup' ? 'athena-btn-primary' : 'athena-btn-secondary'}
              onClick={() => setTab('setup')}
            >
              Setup Wizard
            </button>
            <button
              type="button"
              className={tab === 'diagnostics' ? 'athena-btn-primary' : 'athena-btn-secondary'}
              onClick={() => setTab('diagnostics')}
            >
              <Activity size={13} /> Readiness Check
            </button>
            <button type="button" onClick={onClose} aria-label="Close Setup" style={{ padding: 4, color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {actionError && (
            <div style={{ padding: '8px 12px', border: '1px solid var(--danger)', background: 'rgba(241, 76, 76, 0.12)', borderRadius: 4, fontSize: 12, color: 'var(--danger)' }}>
              {actionError}
            </div>
          )}

          {tab === 'setup' ? (
            <>
              {/* Step 1: Hardware & athena.data */}
              <section style={{ padding: 12, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <HardDrive size={14} color="var(--accent-cyan)" />
                    1. System Check &amp; athena.data Initialization
                  </strong>
                  <span style={{ fontSize: 11, color: dataReport?.ok ? 'var(--success)' : 'var(--danger)' }}>
                    {dataReport?.ok ? 'Writable & Verified' : 'Init Error'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <div>RAM: {totalRamGb} GB total</div>
                  <div>CPU: {hardware?.cpuCores ?? '?'} cores ({hardware?.cpuModel ?? '...'})</div>
                  <div>Disk Free: {diskFreeGb} GB</div>
                  <div>
                    GPU: {hardware?.gpuInfo || 'Uncertain / Not detected'}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  athena.data: {dataReport?.rootDir ?? '...'}
                </div>
                {dataReport && !dataReport.ok && (
                  <button type="button" className="athena-btn-secondary" style={{ marginTop: 6 }} onClick={() => void runFullInspection()}>
                    Retry athena.data Init
                  </button>
                )}
              </section>

              {/* Step 2: Ollama Runtime Detection / Provisioning */}
              <section style={{ padding: 12, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={14} color={envStatus?.apiReachable ? 'var(--success)' : 'var(--warning)'} />
                    2. Local Ollama Runtime ({settings.ollamaEndpoint})
                  </strong>
                  <span style={{ fontSize: 11, color: envStatus?.apiReachable ? 'var(--success)' : 'var(--warning)' }}>
                    {envStatus?.apiReachable
                      ? `Running (${envStatus.executableVersion ?? 'API Ready'})`
                      : envStatus?.installed
                      ? 'Installed (Stopped)'
                      : 'Not Installed'}
                  </span>
                </div>

                {!envStatus?.installed ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p>
                      Ollama is the local AI engine Athena.IDE uses to run open coding models privately on your machine without cloud APIs.
                      Installing Ollama requires internet access and ~500 MB disk space (plus model weights).
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {envStatus?.wingetAvailable && !installingOllama && (
                        <button type="button" className="athena-btn-primary" onClick={() => void handleInstallWinget()}>
                          <Download size={13} /> Install Ollama via winget
                        </button>
                      )}
                      {installingOllama && (
                        <button type="button" className="athena-btn-secondary" onClick={() => void window.athenaApi.cancelOllamaInstall()}>
                          <Square size={12} color="var(--danger)" /> Cancel Installation
                        </button>
                      )}
                      <a
                        href="https://ollama.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="athena-btn-secondary"
                        style={{ textDecoration: 'none' }}
                      >
                        <ExternalLink size={12} /> Download from ollama.com
                      </a>
                      <button type="button" className="athena-btn-secondary" onClick={() => void runFullInspection()}>
                        <RefreshCw size={12} /> Re-check
                      </button>
                    </div>
                    {installLogs && (
                      <pre style={{ maxHeight: 90, overflowY: 'auto', padding: 6, background: 'var(--bg-surface)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                        {installLogs}
                      </pre>
                    )}
                  </div>
                ) : !envStatus.apiReachable ? (
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Found Ollama at <code>{envStatus.executablePath}</code>, but the local service is not running.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="athena-btn-primary" disabled={startingRuntime} onClick={() => void handleStartRuntime()}>
                        <Play size={13} /> {startingRuntime ? 'Starting Ollama...' : 'Start Ollama Runtime'}
                      </button>
                      <button type="button" className="athena-btn-secondary" onClick={() => void runFullInspection()}>
                        <RefreshCw size={12} /> Refresh
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--success)' }}>
                    Connected to local loopback Ollama service ({envStatus.models.length} installed model(s)).
                  </p>
                )}
              </section>

              {/* Step 3: Model Selection & Download */}
              <section style={{ padding: 12, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Database size={14} color="var(--accent-cyan)" />
                    3. Coding Model Selection &amp; Provisioning
                  </strong>
                  {activeModel && (
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      Selected: {activeModel}
                    </span>
                  )}
                </div>

                {envStatus && envStatus.models.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                      Already Installed Models (Ready for Verification):
                    </label>
                    <select
                      value={activeModel}
                      onChange={(e) => void onSelectModel(e.target.value)}
                      style={{ width: '100%', fontSize: 12 }}
                    >
                      {envStatus.models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    Download Recommended Coding Model (Smaller models start faster &amp; use less RAM):
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={targetPullModel}
                      onChange={(e) => setTargetPullModel(e.target.value)}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      {RECOMMENDED_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id}) — {m.sizeApprox} · {m.minRamGb}GB+ RAM
                        </option>
                      ))}
                    </select>
                    {!downloadingModel ? (
                      <button
                        type="button"
                        className="athena-btn-primary"
                        disabled={!envStatus?.apiReachable}
                        onClick={() => void handleDownloadModel()}
                      >
                        <Download size={13} /> Download
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="athena-btn-secondary"
                        onClick={() => void window.athenaApi.abortOllamaPull(targetPullModel)}
                      >
                        <Square size={12} color="var(--danger)" /> Cancel
                      </button>
                    )}
                  </div>

                  {pullStatusText && (
                    <div style={{ fontSize: 11, color: 'var(--accent-cyan)', marginTop: 4 }}>
                      <div>{pullStatusText}</div>
                      {pullPercent !== null && (
                        <div style={{ height: 5, background: 'var(--bg-surface-elevated)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pullPercent}%`, height: '100%', background: 'var(--accent-primary)' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Step 4: Live Model Verification */}
              <section style={{ padding: 12, background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color={setupState?.modelVerified.status === 'verified' ? 'var(--success)' : 'var(--warning)'} />
                    4. Live Local Inference Verification
                  </strong>
                  <span style={{ fontSize: 11, color: setupState?.modelVerified.status === 'verified' ? 'var(--success)' : 'var(--text-muted)' }}>
                    {setupState?.modelVerified.status === 'verified' ? 'Verified Operational' : 'Not Yet Verified'}
                  </span>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Athena.IDE sends a real loopback inference prompt to confirm the model loads and responds cleanly before marking AI Offline-Ready.
                </p>

                <button
                  type="button"
                  className="athena-btn-primary"
                  disabled={!envStatus?.apiReachable || !activeModel || verifying}
                  onClick={() => void handleVerifyModel()}
                >
                  <Play size={13} /> {verifying ? 'Running Verification Prompt...' : `Verify "${activeModel || 'No model'}"`}
                </button>

                {verifyResult && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 11,
                      background: verifyResult.ok ? 'rgba(78, 201, 176, 0.1)' : 'rgba(241, 76, 76, 0.1)',
                      border: `1px solid ${verifyResult.ok ? 'var(--success)' : 'var(--danger)'}`,
                    }}
                  >
                    {verifyResult.ok
                      ? `Verified in ${verifyResult.latencyMs}ms — Output: "${verifyResult.sampleOutput}"`
                      : `Verification failed: ${verifyResult.error}`}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Diagnostics Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {readiness?.summary ?? 'Running checks...'}
                </p>
                <button type="button" className="athena-btn-secondary" onClick={() => void runFullInspection()}>
                  <RefreshCw size={12} /> Re-run Checks
                </button>
              </div>

              {readiness?.checks.map((chk) => {
                const color =
                  chk.status === 'passed'
                    ? 'var(--success)'
                    : chk.status === 'failed'
                    ? 'var(--danger)'
                    : chk.status === 'requires_setup'
                    ? 'var(--warning)'
                    : 'var(--text-muted)';
                return (
                  <div
                    key={chk.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{chk.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{chk.detail}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chk.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button type="button" className="athena-btn-secondary" onClick={() => void handleSkipAi()}>
            Use Editor Without AI For Now
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="athena-btn-secondary" onClick={() => void runFullInspection()}>
              <RefreshCw size={12} /> Refresh All
            </button>
            <button type="button" className="athena-btn-primary" onClick={onClose}>
              {setupState?.modelVerified.status === 'verified' ? (
                <>
                  <CheckCircle size={13} /> Done (AI Verified)
                </>
              ) : (
                'Close'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
