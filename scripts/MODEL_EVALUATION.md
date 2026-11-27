# Local Model Evaluation

## Purpose
Select a model suitable for the target development hardware and the agent's limited tool-use workflow. Model capability varies; no model is presumed best.

## Candidate families to investigate
- Small quantized Qwen coding/instruct models
- Gemma small models
- Phi small models
- Other locally available models with compatible inference/runtime and tool-use behavior

Verify exact model licenses, model-card requirements, quantization format, tool-use support, hardware requirements and version before selecting.

## Evaluation dimensions
- Quality of code for defined tasks
- Correctness and successful build/run
- Tool-call reliability (if supported)
- Context handling
- Repair effectiveness
- Response latency
- RAM/CPU use
- Model load time
- Stability

## Benchmark protocol
1. Use identical tasks, project starting states and tool descriptions.
2. Record exact model version, quantization, runtime, settings and hardware.
3. Run each task multiple times where feasible.
4. Score outputs using predefined criteria.
5. Include failures and incomplete tasks.
6. Do not compare with cloud models unless a separately defined, fair experiment is conducted.
7. Document limitations and model licenses.

## Model selection rule
Select a model based on observed performance and resource use on the actual target device, not model size alone. Offer users a warning about memory requirements and allow them to choose a compatible locally installed model.
