# Project Charter

## Name
NOVA IDE — Offline-First AI Software Development Environment

## Problem
Many people who have ideas for software lack coding knowledge, access to a dependable internet connection, or the resources to continually use cloud-based AI tools. AI-generated code can also fail, and inexperienced users may not know how to diagnose the errors.

## Mission
Prototype an approachable, locally operated software development environment that translates natural-language requests into editable, runnable software projects, and attempts controlled, verifiable recovery from development errors.

## Primary beneficiaries
- Beginners and non-programmers
- Students and learners
- People exploring small web-app ideas
- Users who prefer local processing or have intermittent connectivity

## Aavishkar research contribution
The contribution is the design, implementation and evaluation of a particular integrated workflow: beginner-oriented natural-language interaction + project context + locally hosted model + constrained tool execution + preview + bounded repair + honest verification reporting. Individual technologies and ideas already exist; NOVA does not claim to invent offline AI coding agents.

## Objectives
1. Create a usable desktop MVP.
2. Support local AI inference via Ollama.
3. Enable project-aware file creation and editing.
4. Run and preview selected local web projects.
5. Implement bounded error-recovery attempts.
6. Implement permissions, workspace boundaries and recoverability.
7. Evaluate offline operation, task completion, usability and resource use.

## Success indicators (targets to evaluate, not guaranteed outcomes)
- Core workflows demonstrably work without network connectivity once prerequisites are installed.
- At least three defined sample projects can be created and locally previewed.
- Test results and limitations are recorded transparently.
- Agent tool actions are confined to the designated workspace, with approvals for risky actions.
- A novice-oriented workflow is demonstrated and evaluated with a documented protocol.

## Constraints
- Hardware and memory limitations of local models.
- Model capability and tool-calling differences.
- Project execution can be unsafe if unconstrained.
- Limited project duration and solo development.
- Initial scope restricted to desktop and selected web technologies.

## Out of scope for the MVP
- Cloud accounts or cloud AI API integrations as required functionality.
- Production deployment or automatic publishing.
- Unrestricted shell execution.
- All programming languages and frameworks.
- Guaranteed automatic repair of any bug.
- Android release-ready application.
- Automatic GitHub push, external sharing or remote actions.

## Stakeholders
- Student project developer
- Aavishkar evaluators
- Test participants (if recruited with appropriate consent)
- Supervising faculty / research mentor

## Deliverables
- Desktop prototype
- Source code and reproducible setup instructions
- Documentation and test results
- Model/resource evaluation
- Research presentation/demo and limitations report
