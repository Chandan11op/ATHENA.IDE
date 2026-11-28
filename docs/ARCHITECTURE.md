# Athena.IDE — System Architecture

## 1. Architectural Principles

1. **Offline-First Core:** Editing, file management, terminal execution, local project preview, local Git, knowledge indexing, and Ollama AI inference require zero internet access after installation.
2. **Strict Electron Trust Boundaries:**
   - Renderer runs with `contextIsolation: true` and `nodeIntegration: false`.
   - All privileged operations (filesystem, processes, Git, credentials, Ollama HTTP, `athena.data`) execute in the Main process behind validated `ipcMain.handle` endpoints exposed via `src/preload/index.ts`.
3. **Workspace Sandboxing:** Every file read, write, rename, delete, search, and Git command validates canonical paths via `isPathInsideWorkspace` and blocks sensitive patterns (`.env*`, `*.key`, `*.pem`, `credentials.json`, etc.) from unintended AI context exposure.
4. **Offline-Bundled Assets:** Monaco Editor and xterm.js assets are bundled locally via Vite; CSP blocks remote scripts so the IDE boots cleanly with zero network access.

---

## 2. Process & Module Layout

```text
ATHENA.IDE/
  src/
    common/
      channels.ts        # Allowlisted IPC channel registry
      constants.ts       # Defaults, exclusion & sensitive patterns, model recommendations
      types.ts           # Shared TypeScript contracts across Main, Preload, Renderer
    main/
      index.ts           # Window lifecycle, native menus, hardening, athena.data init
      ipc.ts             # Validated IPC handler registration
      security.ts        # Path traversal guard, sensitive file filter, URL/navigation hardening
      athenaData.ts      # %APPDATA%/Athena.IDE/athena.data directory & snapshot/storage service
      settings.ts        # Atomic settings persistence inside athena.data/settings/
      filesystem.ts      # Workspace tree, CRUD, search, checkpoint snapshots
      terminal.ts        # Multi-session shell process manager (child_process, cwd-bound)
      runner.ts          # Project detector (HTML/Vite/Node), static/dev server, port manager
      ollama.ts          # Localhost Ollama HTTP client (tags, chat stream, generate, pull, delete)
      knowledge.ts       # Local knowledge library & workspace chunk indexer/search
      git.ts             # Sanitized execFile('git', ...) wrapper + diff/branch/commit service
      github.ts          # Optional GitHub API client + Electron safeStorage token vault
      extensions.ts      # Modular local extension lifecycle & permission manager
    preload/
      index.ts           # Strictly typed contextBridge exposure (athenaApi + novaApi alias)
    renderer/
      App.tsx            # VS Code-inspired workbench shell & state orchestration
      styles/index.css   # VS Code Dark+ (default) and Light theme design tokens
      components/        # Header/Menu, ActivityBar, Sidebar views, MonacoEditorArea,
                         # BottomPanel (xterm), StatusBar, AthenaAIChat, Settings, Modals
  website/               # Isolated official landing & download portal (React + Vite)
  docs/                  # Audit, Architecture, Roadmap, Feature Status, Security & Privacy
  tests/                 # Vitest unit & integration test suites
```

---

## 3. Data Architecture (`athena.data`)

Default location: `path.join(app.getPath('userData'), 'athena.data')` (Windows: `%APPDATA%/Athena.IDE/athena.data/`), configurable by the user.

```text
athena.data/
  models/          # Model metadata & user preferences (actual weights remain managed by Ollama)
  knowledge/       # User-added reference documents & snippets
  indexes/         # Chunked workspace & knowledge search indexes
  embeddings/      # Optional local Ollama embeddings cache
  cache/           # Ephemeral runtime caches
  conversations/   # Persisted Athena AI chat threads
  settings/        # settings.json (migrated cleanly from legacy nova-settings.json if present)
  logs/            # Local redacted diagnostics logs
  extensions/      # Installed extension manifests & enabled state
  templates/       # Offline project starter templates (HTML/CSS/JS, React+Vite)
  snapshots/       # Pre-edit recoverable file checkpoints
```

---

## 4. Network Boundary Matrix

| Capability | Offline? | Network Target (When Online) |
| :--- | :--- | :--- |
| Code editing, Explorer, Search, Terminal, Preview | Yes | None (`127.0.0.1` loopback for local dev preview) |
| Ollama AI chat, completions, code edits, indexing | Yes | `http://127.0.0.1:11434` loopback only |
| Local Git (status, stage, commit, branch, diff, log) | Yes | None |
| Ollama model pull (`ollama pull`) | No (explicit user action) | Ollama registry via local Ollama daemon |
| GitHub sign-in, repo list, clone, push, pull | No (optional, user action) | `https://api.github.com` / `https://github.com` |
| Website live release metadata | Online (with cache) | `https://api.github.com/repos/Chandan11op/ATHENA.IDE/releases` |
