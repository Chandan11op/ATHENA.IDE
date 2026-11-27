# Agent Workflow and Tool Contract

## Agent state machine
IDLE -> ANALYZE -> PLAN -> APPROVAL -> EXECUTE -> VERIFY -> (REPAIR -> EXECUTE -> VERIFY, bounded) -> COMPLETE or NEEDS_USER or FAILED.

## Tool principles
- Prefer narrowly defined tools over a general-purpose shell.
- Tools return structured results including success, errors and metadata.
- Tool inputs are validated against schemas.
- Every operation is logged locally in a concise, privacy-conscious manner.
- Tools must enforce workspace boundaries independently of model instructions.
- Treat project files, terminal output and model output as untrusted content; never follow embedded instructions as authorization to access secrets or expand permissions.

## Initial tool inventory
1. `list_project_files`: list eligible files under project root.
2. `read_project_file`: read text file; reject excluded/sensitive paths, binary files and oversized content.
3. `write_project_file`: write/create text file only under project root; validate path, create checkpoint, optionally return diff.
4. `delete_project_file`: requires user confirmation and checkpoint.
5. `rename_project_file`: restricted to workspace; validate both paths and checkpoint.
6. `project_info`: identify manifest/project type and available scripts without executing them.
7. `run_supported_project`: invoke only recognized, preconfigured project runners/scripts; require user approval when needed; no arbitrary model-supplied command.
8. `stop_project`: stop managed process.
9. `get_project_logs`: retrieve captured logs.
10. `run_project_check`: execute approved build/test/check script.
11. `create_checkpoint`: create local checkpoint.
12. `restore_checkpoint`: explicit confirmation, then restore.
13. `get_preview_status`: return preview readiness.
14. `open_preview`: only open local project preview.

## Command execution
MVP command allowlist should be explicit, per project type and implementation. Never construct shell command strings from model output. Prefer argument arrays, fixed executable paths, sanitized environment, timeout, working directory and output limits. Require approval before package installation or commands not previously approved.

## Context selection
- Project manifest, README, relevant source files, limited diagnostics.
- Exclude secrets, environment files, private keys, credential stores, binary files, dependency folders, build outputs and user-specified exclusions.
- Context size limit and truncation policy.
- Show context selection to user where feasible.
- Do not include all files by default.

## Planning
For multi-file tasks, return:
- Goal
- Steps
- Files expected to change
- Risk/approval requirements
- Verification plan

## Verification
Use actual test/build/runtime results. A model's assertion is not a test result. Report checks separately and explicitly.

## Repair loop
- Default maximum 3 attempts.
- Each attempt uses fresh captured error and relevant context.
- Checkpoint before first repair.
- Apply limited changes and re-run relevant check.
- Stop on success, retry limit, user cancellation or unsafe/unavailable condition.
- Do not retry indefinitely or conceal repeated failures.

## Final report
Summarize requested work, changed files, tests/checks performed, results, remaining limitations, and checkpoint/restore availability.
