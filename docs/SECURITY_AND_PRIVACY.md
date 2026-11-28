# Athena.IDE — Security & Privacy Architecture

## 1. Threat Model

Athena.IDE handles local user source code, terminal sessions, Git repositories, and AI prompts generated from potentially untrusted project files. Running models locally does **not** make tool execution or project contents safe. Key threats include:

- Directory traversal or symlink escapes outside the opened workspace.
- Prompt injection inside workspace files attempting to read `.env` / private keys or run destructive commands.
- Arbitrary shell execution from the renderer or AI agent.
- Plain-text credential exposure (e.g., GitHub tokens).
- Unsafe external navigation inside preview frames or main application windows.

---

## 2. Enforced Security Controls

1. **Electron Hardening:** `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `allowRunningInsecureContent: false`.
2. **Preload Boundary:** Only explicitly allowlisted IPC channels (`src/common/channels.ts`) are exposed via `contextBridge`.
3. **Workspace Boundary Validation:** All filesystem, search, checkpoint, and AI file operations resolve canonical paths (`fs.realpathSync` / `path.resolve`) and enforce `isPathInsideWorkspace(workspaceRoot, targetPath)`.
4. **Sensitive File Protection:** `.env*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `credentials.json`, `.npmrc`, `.gitconfig`, `.passwd` are excluded from search/AI context by default.
5. **Process Execution Controls:**
   - Git commands run via `execFile('git', args, { shell: false, cwd })` with fixed argument arrays (no shell interpolation).
   - Terminal sessions lock initial working directory to the workspace and surface confirmation prompts for destructive operations.
   - Project run scripts require explicit user action/consent.
6. **Credential Storage:** Optional GitHub Personal Access Tokens are encrypted at rest via Electron's `safeStorage` (`DPAPI` on Windows, Keychain on macOS, libsecret on Linux) inside `athena.data` and are never exposed to the renderer.
7. **AI Safeguards:**
   - Default AI endpoint is loopback-only (`http://127.0.0.1:11434`).
   - AI file modifications produce an inspectable diff preview and create a pre-edit checkpoint snapshot in `athena.data/snapshots/` before writing on user approval.
   - Agent workflows enforce bounded retry/step caps.
8. **Navigation & Preview Isolation:** `will-navigate` restricts the main window to local file / localhost URLs; external `http/https` links open safely via `shell.openExternal` only when permitted.
9. **Zero Telemetry:** No analytics, tracking, or background cloud calls exist.

---

## 3. Disclosed Network Activity

Athena.IDE operates completely offline for editing, terminal, local preview, local Git, and local Ollama inference. Network access is used **only** when the user explicitly triggers:
- Pulling a model via Ollama (`ollama pull`).
- Connecting/pushing/pulling/cloning with GitHub.
- Running `npm install` or package manager commands inside a project.
- Checking or downloading application releases from GitHub.
