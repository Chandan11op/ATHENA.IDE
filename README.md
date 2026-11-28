# Athena.IDE

**An Offline-First, AI-Assisted Desktop Integrated Development Environment**  
**Repository:** https://github.com/Chandan11op/ATHENA.IDE  
**Website:** https://athenaide.vercel.app/

> *Note: Formerly bootstrapped under the working prototype name NOVA IDE (historical specification drafts remain archived in `scripts/`).*

---

## Project Overview

Athena.IDE is an Electron, React, TypeScript, and Vite desktop IDE inspired by Visual Studio Code's ergonomics and powered by local Ollama models (`http://127.0.0.1:11434`). After installing the application, Node.js/Git prerequisites, and local models, core editing, file management, terminal, local preview, Git, and AI workflows operate completely offline.

## Key Capabilities & Architecture

- **VS Code-Inspired Workbench:** Dark+ default theme (with Light theme option), Activity Bar, Explorer, Workspace Search, Source Control, Run & Debug, Extensions, Athena AI Chat, Integrated Terminal (`xterm.js`), and Monaco Editor (bundled offline).
- **Local AI Engine (Ollama):** Detection, model listing, streaming chat, inline completions, model pull/removal, RAM-aware model recommendations, and diff-previewed bounded agent workflows.
- **`athena.data` Architecture:** Structured local storage under `%APPDATA%/Athena.IDE/athena.data/` (`models/`, `knowledge/`, `indexes/`, `embeddings/`, `cache/`, `conversations/`, `settings/`, `logs/`, `extensions/`, `templates/`, `snapshots/`).
- **Security & Trust Boundaries:** Context isolation, strict IPC allowlisting, canonical workspace path sandboxing, sensitive file exclusions (`.env*`, `*.key`, `*.pem`, `credentials.json`), and OS `safeStorage` encryption for optional GitHub tokens.
- **Official Website (`website/`):** Isolated landing, documentation, and release portal connected to GitHub Releases.

## Documentation

- [Implementation Audit](docs/IMPLEMENTATION_AUDIT.md)
- [Production Roadmap](docs/PRODUCTION_ROADMAP.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Feature Status](docs/FEATURE_STATUS.md)
- [Security & Privacy](docs/SECURITY_AND_PRIVACY.md)

## Quickstart (Development)

```bash
# 1. Install dependencies
npm install

# 2. Build main, preload, and renderer bundles
npm run build

# 3. Run automated tests
npm test

# 4. Launch the desktop application
npm start
```

## Troubleshooting

- **Ollama Offline:** Start the local Ollama daemon (`http://127.0.0.1:11434`) and pull a coding model such as `ollama pull qwen2.5-coder:1.5b`.
- **Electron Launch Inside IDE Shells:** `electron-run.cjs` automatically clears `ELECTRON_RUN_AS_NODE` before spawning Electron.
