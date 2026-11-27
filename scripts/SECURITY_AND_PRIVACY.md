# Security and Privacy Requirements

## Threat model
NOVA handles user code, files, logs and potentially untrusted project contents. Local AI does not make tool execution safe. Risks include malicious project files or prompt injection, path traversal, arbitrary command execution, dependency supply-chain risks, secrets leakage, destructive edits and unsafe preview navigation.

## Required controls
1. Workspace sandbox boundary: all file tools validate canonical paths and reject traversal/symlink escapes where applicable.
2. No unrestricted shell tool exposed to model.
3. Electron hardening: context isolation, renderer sandbox where feasible, disabled Node integration in renderer, validated IPC and maintained dependencies.
4. Process execution: fixed executable and argument arrays, working-directory restriction, timeouts, output limits, environment sanitization, cancellation.
5. Command approval: require explicit approval for package installation, unknown scripts, elevated operations or commands outside allowlist.
6. File deletion and checkpoint restore require explicit confirmation.
7. Checkpoint before batch edits and risky changes.
8. Secret exclusion: `.env*`, private keys, credential files and sensitive folders excluded by default; user can configure exclusions.
9. Preview: bind to localhost by default; restrict navigation and external URLs.
10. No network calls by AI model provider during normal inference; verify and document local provider endpoint. Other application features must disclose any network use.
11. No telemetry or remote logging by default. If optional telemetry is ever added, it must be explicit opt-in and documented.
12. Model output and project content are untrusted; do not let content override tool permissions.
13. Redact secrets from logs and errors where feasible.
14. Model downloads, dependency installs and external integrations must be user initiated and disclosed.

## Approval matrix
- Read eligible workspace text files: allowed after workspace selection.
- Create/edit files: allowed within workspace, with checkpoint/diff visibility.
- Delete/overwrite: confirmation/checkpoint.
- Execute recognized project tasks: allowlisted, supervised, approval policy documented.
- Install packages: explicit approval.
- Unknown command: reject or require approval; do not execute by default.
- Restore checkpoint: explicit confirmation.
- External publication, remote push, credential access: out of MVP; no automatic actions.

## Safety acceptance tests
- Traversal path rejected.
- Symlink escape rejected or safely handled.
- Attempt to read excluded secret file denied.
- Arbitrary command request rejected.
- Unknown script not executed without approval.
- Process timeout/cancel works.
- Preview external navigation restricted.
- Renderer cannot directly access filesystem or Node APIs.
- Agent prompt injection in project files cannot grant extra permissions.
- Restore requires confirmation.
