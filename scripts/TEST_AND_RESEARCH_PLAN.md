# Test and Research Plan

## Testing layers
- Unit tests: path validation, tool argument validation, context filtering, retry counter, model adapter, state transitions.
- Integration tests: Ollama connection, project create/read/write, supported runner, logs, preview, checkpoint and restore.
- UI tests: onboarding, model selection, chat, plan approval, workspace, preview, error states.
- Security tests: workspace traversal, excluded secrets, command allowlist, approval gates, IPC boundary.
- Manual offline tests: disconnect internet after prerequisites/model/dependencies are installed.
- Usability test: task-based evaluation with consenting participants and appropriate institutional/supervisor guidance.

## Example benchmark tasks
1. Generate a simple informational website.
2. Add a form with local validation.
3. Modify styling and responsive layout.
4. Fix a deliberately introduced syntax error.
5. Fix a broken import or path in a supported project.
6. Explain a captured build error.
7. Create a checkpoint and restore it.

## Metrics
- Task success rate (predefined objective and rubric).
- Build/run success rate.
- Repair success rate (successful verification after repair / repair attempts).
- Error detection rate.
- Repair attempts and time.
- Time to task completion.
- Model response latency.
- Peak RAM and CPU (record methodology).
- Offline completion rate.
- User-reported ease, clarity and confidence (questionnaire defined separately; obtain consent).

## Experimental design
- Document hardware, operating system, model name/version, quantization, context settings, runtime version and project dependencies.
- Define tasks and scoring before tests.
- Use repeatable starting project states.
- Record failures as well as successes.
- Do not cherry-pick successful outputs.
- Clearly distinguish measured results from subjective observations.
- Avoid claims of broad effectiveness based on a small sample.

## Offline test procedure
1. Install NOVA and Ollama.
2. Download model and required dependencies beforehand.
3. Record baseline hardware metrics.
4. Disconnect network and verify status.
5. Perform defined tasks and record outputs.
6. Confirm core operations do not require remote AI requests.
7. Reconnect only if needed for setup; label such steps as non-offline.

## Research ethics
Use informed consent for participant testing; avoid collecting unnecessary personal data. Follow school/university instructions and supervisor approval. Report sample size, limitations and anonymized findings where appropriate.
