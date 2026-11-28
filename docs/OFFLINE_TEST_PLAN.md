# Athena.IDE — Repeatable Offline Test Procedure

Use this checklist to verify offline-first compliance after prerequisites (Athena.IDE, Git, Node.js, Ollama, and at least one local model such as `qwen2.5-coder:1.5b`) are installed.

1. **Disconnect Network:** Disable Wi-Fi / Ethernet (keep loopback `127.0.0.1` active).
2. **Startup & Theme:** Launch `Athena.IDE`. Confirm it opens in VS Code Dark+ theme without remote asset failures in DevTools Console.
3. **athena.data Persistence:** Open `Settings & athena.data` (`Ctrl+,`), confirm `%APPDATA%/Athena.IDE/athena.data` stats render, switch theme to Light+ and back to Dark+, restart, and verify persistence.
4. **Workspace & Explorer:** Open a local folder (`Ctrl+O`), create a file (`index.html`), create a folder, rename a file, and delete a test file (with confirmation).
5. **Monaco Editor & Search:** Edit `index.html`, verify dirty dot (`●`), save (`Ctrl+S`), and search (`Ctrl+Shift+F`) for text inside the file.
6. **Integrated Terminal:** Toggle terminal (`Ctrl+J`), run `dir` / `ls` and `node -v`, and create a second shell tab.
7. **Local Runner & Preview:** Open `Run and Debug`, click **Start Local HTML Preview**, confirm the page renders inside Athena.IDE's Preview tab at `http://127.0.0.1:<port>/`, then click **Stop**.
8. **Local Ollama AI:** Confirm `Local Only` status and Ollama online indicator, select `qwen2.5-coder:1.5b`, ask Athena AI to explain the open file, verify streaming output, and test `athena.data` Knowledge indexing.
9. **Local Git:** Open `Source Control` (`Ctrl+Shift+G`), inspect modified files, view diff, stage, and create a local commit without internet.
10. **Network-Gated Actions (Expected Behavior Offline):** Attempt `ollama pull` or GitHub repo list while disconnected and verify clear, non-crashing error messages.
