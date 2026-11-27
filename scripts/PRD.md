# Product Requirements Document (PRD)

## 1. Product
NOVA IDE is a local desktop software-development environment with an AI agent that helps beginners create, modify, run, preview and troubleshoot supported software projects through natural-language requests.

## 2. Product principles
- Local-first, offline-capable after prerequisites are installed/downloaded.
- Beginner-friendly without hiding access to code or technical detail.
- Project-aware, not a stateless code generator.
- Recoverable, permission-controlled changes.
- Transparent: show activity, file changes, verification and uncertainty.
- Modular, maintainable and testable.

## 3. User personas
**Beginner:** Has an idea but little/no coding knowledge; needs plain-language guidance and preview.
**Learner/developer:** Wants to inspect code, files, logs and agent actions.
**Resource-constrained user:** Prefers local inference and does not depend on cloud services.

## 4. Primary user stories
- As a user, I can create a project by describing its purpose.
- I can choose or confirm a project template and technologies.
- I can see a plan before the agent makes significant changes.
- I can ask for changes in ordinary language.
- I can inspect the files changed by the agent.
- I can run a supported project locally and see its preview.
- I can ask the agent to diagnose an error from actual logs.
- I can approve, reject or revert proposed changes.
- I can save checkpoints and restore them.
- I can use the AI chat with a locally available model when offline.
- I can see when the model is missing, unavailable or overloaded.
- I can use Beginner Mode or Developer Mode.
- I can export/backup a project locally.

## 5. Functional requirements

### F1 — Onboarding and prerequisite check
- Detect whether Ollama is reachable locally.
- Display model availability and relevant status.
- Offer a clear manual setup guide if missing.
- Do not download/install anything without clear user action.
- Check disk space and provide warnings where possible.

### F2 — Model management
- List models available from the local Ollama installation.
- Let the user select a model.
- Show model name, availability, and a warning that capabilities/performance vary.
- Allow configuring generation settings within reasonable bounds.
- Provide stop/cancel controls for generation.
- Handle timeouts and unavailable model errors gracefully.

### F3 — Chat
- Stream responses where supported.
- Persist local conversations per project (and optionally general chat).
- Support code blocks and plain-language explanations.
- Offer a clear action to attach relevant project context.
- Avoid implying the model has performed an action unless tool results confirm it.

### F4 — Project workspace
- Create a new project in a chosen location within a configured workspace.
- Import or open a project directory using a safe file picker.
- Display a project tree.
- Read and edit text files.
- Create, rename and delete files; deletion requires confirmation.
- Protect sensitive and excluded paths, and reject path traversal.
- Display a diff/preview of proposed changes when feasible.

### F5 — Project context
- Read project manifest and relevant files.
- Detect supported project type.
- Include only relevant context in prompts.
- Respect context size and configurable exclusions.
- Exclude secrets, hidden sensitive files and binary files by default.
- Show the files included as context when feasible.

### F6 — Agent planning and tool execution
- Generate a task plan for multi-step requests.
- Provide a progress/status display.
- Use narrowly scoped tools for file access, project inspection, commands and tests.
- Keep all file operations inside the selected workspace.
- Validate tool arguments and outputs.
- Require approval for risky or unfamiliar actions.

### F7 — Supported project execution
- MVP support: static HTML/CSS/JS and selected React/Vite projects.
- Start/stop supported local development processes.
- Capture stdout/stderr and process status.
- Avoid exposing the development server outside localhost by default.
- Prevent the agent from launching unapproved arbitrary commands.
- Show a clear unsupported-project message instead of guessing.

### F8 — Live preview
- Display the local project preview.
- Provide refresh, open-in-window and stop controls.
- Use localhost-only service configuration.
- Report when preview is unavailable.

### F9 — Error diagnosis and bounded recovery
- Capture actual build, test or runtime errors.
- Ask the model to diagnose using relevant files and error output.
- Offer a repair plan and apply edits with checkpoint/diff.
- Maximum configurable repair iterations; MVP default: 3.
- Re-run the relevant check after a repair.
- Stop after retry limit or when verification cannot be performed.
- Report what passed, failed or remains unverified.

### F10 — Checkpoints and recovery
- Create checkpoint before agent batch edits and risky operations.
- Restore checkpoint after explicit user confirmation.
- Keep checkpoint storage local.
- Use a documented implementation (e.g. Git-backed checkpoints or safe snapshots); do not rely on undocumented Git behavior.

### F11 — Beginner and Developer modes
Beginner Mode: simplified project controls, plain language, plan, progress, preview, explanations, minimal technical jargon.
Developer Mode: editor, file tree, terminal/logs, model context details, diff, settings.
Mode switching must not remove access to project data.

### F12 — Local export/backup
- Export project as ZIP or copy to chosen local destination.
- Exclude caches, generated build folders and secrets by default.
- Warn about included files and destination.

## 6. Non-functional requirements
- Core local functionality should not require internet after model/runtime/dependencies are installed.
- No telemetry or remote prompt transmission by default.
- Handle model errors, crashes and interrupted generation gracefully.
- UI remains responsive during model generation and project tasks.
- Logs should avoid secrets and remain local.
- Accessibility: keyboard navigation, clear labels, contrast, readable text.
- Use an architecture that supports future platform/model adapters.
- Document resource usage and known limitations.

## 7. MVP acceptance criteria
1. App launches and presents prerequisite/model status.
2. App can connect to a locally running Ollama service.
3. User can select a locally available model.
4. User can create/open a workspace project.
5. User can request a simple HTML/CSS/JS project in plain language.
6. Agent can create files using workspace-restricted tools.
7. User can inspect files and changes.
8. Supported project can be started and stopped.
9. Preview shows the running local project.
10. App captures an actual error and attempts up to the configured retry limit.
11. Repair is re-tested; results are reported honestly.
12. Checkpoint restore works with confirmation.
13. Core functionality is tested with network disconnected after setup.
14. No automatic publishing or remote Git push is implemented.
