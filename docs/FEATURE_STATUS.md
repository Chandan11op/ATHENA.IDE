# Athena.IDE — Feature Status Matrix

This matrix distinguishes **Verified Working**, **Implemented (External Runtime Dependent)**, and **Unsupported / Planned** capabilities honestly.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Electron shell & context isolation | Verified | Hardened `BrowserWindow`, preload `contextBridge`, no Node in renderer |
| Path traversal & secret exclusion | Verified | Unit-tested in `tests/security.test.ts` and `tests/services_production.test.ts` (including symlink resolution) |
| VS Code Dark+ / Light+ themes | Verified | Dark+ default (`#1e1e1e`, `#252526`, `#333333`, `#007acc`), Light+ alternative, persisted in `athena.data/settings/settings.json` |
| Native Workspace Picker & Explorer | Verified | Sandbox-checked tree, create file/folder, rename, delete (with confirmation), refresh |
| Monaco Code Editor | Verified | Offline-bundled via Vite workers, multi-tab dirty indicator, Save/Save As, Word Wrap, Problems markers, DiffEditor |
| Workspace Search | Verified | Filename & content search across non-excluded workspace files |
| Integrated Terminal (`xterm.js`) | Verified | Multi-tab interactive shell bound to workspace cwd using `@xterm/xterm` + Node stdio streams (not full native ConPTY VT emulation) |
| Local Execution & Preview | Verified | Built-in `127.0.0.1` HTML static server (tested with 403 traversal guard) + consent-gated `npm` script runner |
| Local Ollama Engine & Model Manager | Implemented (Loopback Tested) | `/api/tags`, `/api/chat` streaming, `/api/generate` inline completions, `/api/pull`, `/api/delete`, RAM-aware recommendations; live model inference requires local Ollama installed from `https://ollama.com/` |
| AI Diff Preview & Checkpoints | Verified | Workspace-validated proposed edits, pre-edit checkpoint snapshots in `athena.data/snapshots/`, restore support |
| `athena.data` & Knowledge Library | Verified | Structured `%APPDATA%/Athena.IDE/athena.data/` hierarchy, conversation persistence, local chunk indexer & query |
| Local Git Integration | Implemented (Requires OS `git`) | `execFile('git', ...)` status, diff, stage/unstage, commit, branches, log, pull/push/fetch, clone |
| Optional GitHub Integration | Implemented (Requires User PAT) | Optional PAT encrypted at rest via Electron `safeStorage`; repo list & clone |
| Modular Extensions Manager | Verified | Local Athena extension manifests in `athena.data/extensions/`, enable/disable, install/uninstall; arbitrary VS Code `.vsix` binaries are not compatible |
| Windows Installer Packaging | Verified | Generated & verified `Athena.IDE-0.2.0-win-x64-setup.exe`, `Athena.IDE-0.2.0-win-x64-portable.exe`, and `SHA256SUMS.txt` via `electron-builder` |
| Website Live Release Portal | Verified (Build & Adapter Tested) | Wired `website/src/services/releaseAdapter.ts` to `website/src/backend/` GitHub Releases adapter with `vercel.json` SPA rewrites |
