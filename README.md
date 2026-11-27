# Athena.IDE — Project Blueprint

**Research project:** NOVA IDE (Natural-language Oriented Virtual Assistant for Development)  
**Purpose:** Build an offline-first, beginner-friendly AI software development environment for the Aavishkar 2026–27 research project.

## Project premise
NOVA is a local desktop IDE that lets users describe software changes in everyday language, inspect and edit generated code, run supported projects locally, preview results, and attempt controlled error recovery—without relying on cloud AI APIs during normal operation after models and required dependencies are installed.

This is an engineering prototype and research system. It must not claim to outperform large cloud models, autonomously fix all bugs, or safely run arbitrary commands.

## Scope and priority
- **Primary deliverable:** Windows-friendly desktop MVP.
- **Initial project support:** HTML, CSS, JavaScript and a constrained React/Vite workflow.
- **AI runtime:** Ollama, with model selection and availability checks.
- **Core experience:** Beginner Mode and Developer Mode.
- **Research focus:** offline operation, novice accessibility, model/resource feasibility, task completion and bounded error recovery.
- **Secondary / later:** Android feasibility prototype, project transfer, GitHub integration, deployment, broad language/framework support.

## Read the specification
Antigravity should read these documents in order:
1. `PROJECT_CHARTER.md`
2. `PRD.md`
3. `USER_FLOWS.md`
4. `SYSTEM_ARCHITECTURE.md`
5. `AGENT_WORKFLOW.md`
6. `UI_SPECIFICATION.md`
7. `DATABASE_SCHEMA.md`
8. `SECURITY_AND_PRIVACY.md`
9. `TEST_AND_RESEARCH_PLAN.md`
10. `ROADMAP_AND_KANBAN.md`
11. `MODEL_EVALUATION.md`
12. `MASTER_IMPLEMENTATION_PROMPT.md`

## Start-up prerequisites
- Git
- Node.js LTS and npm
- A compatible Ollama installation
- At least one downloaded model that supports the intended coding and tool-use workflow (model capabilities vary)
- The project must detect missing prerequisites and guide users without falsely claiming they are installed.

## Development principles
1. Build in small, testable milestones; do not generate the entire system in one unverified pass.
2. Keep the agent's tool permissions narrow, explicit and workspace-bound.
3. Never make cloud AI or network connectivity a prerequisite for core local functions.
4. Distinguish confirmed verification from assumptions.
5. Create recoverable checkpoints before risky changes.
6. Do not silently delete files or perform external actions.
7. Keep model and user-project data local by default.
8. Use a modular architecture and maintain this documentation as implementation changes.

## MVP definition of done
See `PRD.md` and `TEST_AND_RESEARCH_PLAN.md`. A successful MVP must build and run, connect to a locally available model through Ollama, create and manage a project in a workspace, produce code, run a supported local web project, show a preview, capture relevant errors, attempt a bounded repair, and report test/verification status honestly.

## Implementation Status & Quickstart

### Current Milestones Achieved
- **M0: Repository Inspection & Bootstrap** — Fully operational with Electron, React 19, TypeScript, and Vite.
- **M1: Secure Desktop Shell** — Hardened Electron main process with context isolation, secure preload bridge, path sandboxing, zero-cloud offline detection, Beginner & Developer modes, settings persistence, and native workspace picker.

### Setup & Build Commands

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application (Main, Preload, and Renderer):**
   ```bash
   npm run build
   ```

3. **Run automated security & integration tests:**
   ```bash
   npm test
   ```

4. **Launch Desktop Application:**
   ```bash
   npm start
   ```

### Troubleshooting
- **Ollama Detection:** If Ollama is offline or not installed, NOVA detects this automatically, shows the "Local AI Offline" status badge, and opens the built-in manual setup instructions (`http://127.0.0.1:11434`, `ollama pull qwen2.5-coder:1.5b`).
- **Environment Isolation:** If running inside existing IDE shells where `ELECTRON_RUN_AS_NODE` might be exported, ensure it is unset prior to launching GUI Electron (`set ELECTRON_RUN_AS_NODE=`).
