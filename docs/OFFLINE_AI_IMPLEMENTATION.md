# Athena.IDE — Offline-First AI & Editor Root Cause Audit

**Audit Date:** 2026-11-28  
**Target Platform:** Windows 10/11 x64 Desktop MVP  
**Repository:** `https://github.com/Chandan11op/ATHENA.IDE`

---

## 1. Root Cause #1 — Central Editor Stuck on `"Loading..."`

### Observed Symptom
When opening a file tab in the desktop Electron app, the central editor area remained stuck displaying `"Loading..."` despite visible editor tabs.

### Verified Root Cause
Runtime inspection of `dist/renderer/index.html` inside Electron (`console-message` + `window.MonacoEnvironment` check) revealed:
1. `src/renderer/components/EditorArea.tsx` imported `import { monaco } from '../monacoSetup.js'` **only** for TypeScript type positions (`monaco.editor.IMarker`, `monaco.IDisposable`, `monaco.editor.ITextModel`).
2. TypeScript / Vite (`isolatedModules`) elided the import as a type-only import during compilation, so `src/renderer/monacoSetup.ts` **never executed** in the built renderer (`window.MonacoEnvironment` evaluated to `false`).
3. Because `loader.config({ monaco })` never ran, `@monaco-editor/loader` fell back to injecting `<script src="https://cdn.jsdelivr.net/npm/monaco-editor/.../loader.js">`, which is blocked by the app's strict offline CSP (`script-src 'self'`) and unavailable offline—leaving `@monaco-editor/react` permanently stuck on its `"Loading..."` fallback.
4. Additionally, `monaco-editor@0.58.0` exports worker entry points under `monaco-editor/editor/editor.worker` and `monaco-editor/language/*/worker` (not `monaco-editor/esm/vs/...`), and Windows file paths (`C:\...`) require `monaco.Uri.file(...)` normalization.

### Fix Applied & Verified
- Imported `./monacoSetup.js` directly in `src/renderer/main.tsx` and called `ensureMonacoConfigured()` in `EditorArea.tsx`.
- Updated worker imports in `src/renderer/monacoSetup.ts` + `src/renderer/vite-env.d.ts` to match `monaco-editor@0.58.0` package exports (`monaco-editor/editor/editor.worker?worker`, `json`, `css`, `html`, `ts`), producing local `dist/renderer/assets/*.worker-*.js` and `codicon-*.ttf`.
- Normalized model `path` props via `toMonacoModelUri(activeTab.path)` (`monaco.Uri.file(...)`).
- Verified in real Electron (`dist/main/index.cjs` + `dist/preload/index.cjs` + `dist/renderer/index.html`) opening a real TypeScript file: `monacoCount: 1`, `stillLoading: false`, `hasMonacoEnv: true`, zero console errors, and `Ln 1, Col 1 / typescript` rendered in the Status Bar.

---

## 2. Root Cause #2 — Ollama Offline / No Model State & Missing Provisioning

### Inspection Findings on Target Environment
- `where.exe ollama`: Not found in `PATH`.
- `%LOCALAPPDATA%\Programs\Ollama`, `%LOCALAPPDATA%\Ollama`, `%ProgramFiles%\Ollama`, and Registry Uninstall entries: `ollama.exe` is **not installed** on this system.
- `C:\Users\Admin\.ollama`: Exists with cached metadata (`qwen3:0.6b` manifest), confirming Ollama had been used previously but is not currently installed or running on `127.0.0.1:11434`.
- `winget`: Installed (`v1.29.380` at `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe`), enabling optional, user-consented installation via Windows Package Manager alongside the official `https://ollama.com/download` installer.

### Fixes Implemented
1. **Structured `athena.data` Initialization (`src/main/athenaData.ts`):**
   - Creates and permission-verifies `config/`, `knowledge/{docs,snippets,resources,manifests}`, `indexes/`, `embeddings/`, `workspace-context/`, `cache/`, `conversations/`, `logs/`, `diagnostics/`, `setup/`, `snapshots/`.
   - Persists versioned `config/config.json` and `setup/setup-state.json` tracking every bootstrap phase independently (`appInitialized`, `dataDirInitialized`, `ollamaDetected`, `ollamaInstalled`, `ollamaApiVerified`, `modelInstalled`, `modelVerified`, `aiOperational`, `setupCompleted`, `skippedAiSetup`).
2. **Ollama Discovery, Startup & Consented Provisioning (`src/main/ollama.ts`):**
   - `inspectOllamaEnvironment`: checks `PATH`, Windows AppData/ProgramFiles install paths, POSIX paths, `--version`, `winget`, `/api/tags`, `/api/version`, `/api/ps`.
   - `startOllamaRuntime`: spawns `ollama serve` (loopback only) when installed but stopped, avoiding duplicate spawns and polling `/api/tags` up to 8s.
   - `installOllamaViaWinget` + `cancelOllamaInstall`: optional user-consented Windows installation with live log streaming.
   - `pullOllamaModel` + `abortOllamaPull`: real `/api/pull` NDJSON download with byte progress, cancel, and retry.
   - `verifyOllamaModel`: confirms model presence and runs an actual `/api/generate` inference request before setting `modelVerified` and `aiOperational`.
3. **Offline Readiness Diagnostics (`src/main/diagnostics.ts`):**
   - Implements all 9 readiness states (`not_configured`, `setup_required`, `runtime_unavailable`, `model_unavailable`, `model_downloading`, `model_verification_pending`, `ai_operational`, `offline_ready`, `degraded`) and 10 transparent checks (`passed`, `failed`, `not_tested`, `requires_setup`).
   - Marks `offline-disconnect` as `not_tested` until a real disconnected-network test is executed (`docs/OFFLINE_TEST_PLAN.md`).
4. **Local Knowledge Pack (`src/main/knowledge.ts`):**
   - Adds `seedInitialPack()` creating lightweight project-authored references (`html-css-essentials.md`, `javascript-typescript-basics.md`, `react-vite-offline-guide.md`, `ollama-local-models.md`) and `knowledge/manifests/initial-pack.json`.
5. **Setup & Diagnostics Wizard (`src/renderer/components/OnboardingModal.tsx`):**
   - Guides users through System & Hardware Assessment, `athena.data` verification, Ollama installation/startup, model download, live verification, and Offline Readiness Diagnostics (with option to skip AI and resume later).

---

## 3. Website Release Integration

- Wired `website/src/services/releaseAdapter.ts` to `website/src/backend/` (`BackendGitHubReleaseAdapter`), propagating `isStale` and `rateLimitResetAt`.
- Updated `DownloadPage`, `ReleasesPage`, and `ReleaseDetailPage` to display truthful development status when GitHub has zero published releases, handle stale cache fallback and rate-limit errors, and bypass cache on Retry.
