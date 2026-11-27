# User Flows

## Flow A — First launch
1. Launch NOVA.
2. Show concise welcome and explanation of local/offline operation.
3. Check app configuration and Ollama availability.
4. If unavailable, display guided setup (no silent installation).
5. If available, enumerate models and indicate which are locally installed.
6. User selects model and workspace folder.
7. Show readiness checklist and enter workspace.

## Flow B — Create project
1. User selects New Project.
2. User describes project in plain language.
3. NOVA asks only necessary clarifying questions and offers supported template options.
4. NOVA proposes a short plan and project location.
5. User confirms.
6. NOVA creates files inside workspace, with checkpoint.
7. Show progress and changed-file list.
8. Start project if supported.
9. Show preview and summary of verified/unverified results.

## Flow C — Modify project
1. User submits request.
2. Agent inspects project metadata and relevant files.
3. Agent proposes plan and files likely to change.
4. User approves plan (Beginner Mode may provide a simplified approval).
5. Agent performs restricted file operations.
6. Show diff/change summary.
7. Run relevant check and preview.
8. Report outcome.

## Flow D — Debug/repair
1. User reports issue or selects captured error.
2. Agent retrieves actual logs and relevant files.
3. Agent explains likely cause in simple language.
4. Agent creates checkpoint.
5. Agent proposes/apply controlled repair.
6. Re-run check.
7. Repeat up to 3 attempts by default.
8. If unresolved, stop, preserve state and explain options.

## Flow E — Checkpoint restore
1. User opens checkpoint history.
2. Select checkpoint and review timestamp/description.
3. NOVA warns which current changes will be replaced.
4. User confirms.
5. Restore and verify project state.

## Flow F — Developer Mode
1. Switch to Developer Mode.
2. Display project tree, editor, logs/terminal area, AI panel and preview.
3. Keep agent actions visible.
4. Terminal commands are allowlisted or approved; arbitrary execution is restricted.

## Flow G — Offline test
1. Install app, Ollama and required model; prepare dependencies.
2. Disconnect internet.
3. Launch NOVA and verify local model status.
4. Create/modify/run supported project.
5. Record network independence, performance and limitations.
