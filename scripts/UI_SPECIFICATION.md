# UI Specification

## Design direction
A modern, calm, accessible desktop interface. Prioritize understandable labels and visual feedback over a crowded developer dashboard. Dark theme may be the default, but ensure a light theme or theme setting is available.

## Main shell
- Top bar: NOVA brand, project name, model status, offline/local status, mode toggle, settings.
- Left panel: project tree (collapsible).
- Center panel: editor tabs or beginner-focused workspace.
- Right panel: AI conversation (collapsible).
- Bottom panel: managed terminal/logs, diagnostics and task status.
- Preview: integrated tab/panel with local preview controls.

## Beginner Mode
Primary layout:
1. Project overview and file list.
2. Chat prompt with example suggestions.
3. Visible plan/task progress.
4. Preview card/window.
5. Plain-language status and verification.
Hide technical clutter, but do not hide safety prompts or status.

## Developer Mode
- Project tree
- Monaco editor
- AI chat
- Preview
- Logs/managed terminal
- Diff and checkpoint controls
- Model/context diagnostics

## Onboarding
- Explain local inference and model prerequisites.
- Display Ollama detection status.
- Model list/loading status.
- Workspace chooser.
- Offline-readiness status (distinguish model downloaded from dependencies installed).
- User can skip onboarding but must not be misled.

## Interaction states
- Idle
- Model loading
- Generating
- Tool executing
- Awaiting approval
- Preview starting
- Verifying
- Repairing (attempt number)
- Completed
- Failed
- Cancelled

## Accessibility and UX
- Keyboard navigation and visible focus.
- Readable contrast and scalable text.
- Clear button labels and tooltips.
- Confirmation dialogs for deletion, restore, installs and risky commands.
- Avoid relying only on color to communicate status.
- Provide cancel controls for long-running tasks.
