# Athena.IDE — Production Roadmap

This roadmap tracks the progressive transformation of Athena.IDE from its M0/M1 desktop shell into a production-oriented, offline-first desktop IDE.

| Milestone | Scope | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **M0 — Audit** | Repository inspection & docs | `IMPLEMENTATION_AUDIT.md`, `PRODUCTION_ROADMAP.md`, `ARCHITECTURE.md`, `FEATURE_STATUS.md`, `SECURITY_AND_PRIVACY.md`, branding cleanup | Completed |
| **M1 — UI Foundation** | VS Code-inspired theme & shell | Centralized Dark+ / Light+ theme tokens, Title/Menu bar, Activity Bar (Explorer, Search, Source Control, Run & Debug, Extensions, Athena AI), resizable panels, Status Bar | Completed |
| **M2 — Workspace & Editor** | Real filesystem & Monaco Editor | Workspace-sandboxed file CRUD, recursive Explorer, offline-bundled Monaco Editor, multi-tab dirty tracking, Save/Save As, workspace Search | Completed |
| **M3 — Terminal & Execution** | Real shell & project runner | `@xterm/xterm` terminal sessions bound to workspace cwd, project detector (HTML/CSS/JS/React/Vite), consent-gated runner, localhost Preview | Completed |
| **M4 — Ollama Runtime** | Local AI engine & model manager | `/api/tags`, `/api/chat` streaming, `/api/generate`, `/api/pull`, `/api/delete`, RAM-aware model recommendations, privacy indicators | Completed |
| **M5 — AI Coding & Agent** | Contextual assistant & safe diffs | Explain/Generate/Refactor/Debug/Tests, workspace/file/selection/knowledge context, structured diff preview, checkpoints | Completed |
| **M6 — Athena.data** | Structured local storage & RAG | `%APPDATA%/Athena.IDE/athena.data/` hierarchy, conversation persistence, knowledge library, local chunk indexing & search, data management UI | Completed |
| **M7 — Source Control (Git)** | Local Git workflows | `git` status, stage/unstage, commit, diff view, branch list/create/checkout, commit history via sanitized `execFile('git', ...)` | Completed |
| **M8 — GitHub Integration** | Optional GitHub workflows | OS `safeStorage` PAT auth, repo list, clone, fetch/pull/push, remote inspection (strictly optional) | Completed |
| **M9 — Extensions** | Modular extension manager | Local extension registry in `athena.data/extensions/`, enable/disable, install/uninstall, permission model, honest compatibility notes | Completed |
| **M10 — Packaging & CI/CD** | Distributable desktop builds | `electron-builder.yml` (Windows NSIS + portable, macOS/Linux targets), SHA-256 checksums, GitHub Actions CI & release workflow | Completed |
| **M11 — Website Portal** | Live download portal | Wired `website/src/services/releaseAdapter.ts` to `website/src/backend/` GitHub Releases adapter, `vercel.json` SPA rewrites | Completed |
| **M12 — Validation** | QA & verification | Unit/integration tests, TypeScript checks, production builds, Electron smoke test, Windows `.exe` package verification, `OFFLINE_TEST_PLAN.md` | Completed |
