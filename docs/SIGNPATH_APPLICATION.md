# SignPath Foundation Application Package — ATHENA.IDE

**Reference Program:** https://signpath.org/  
**Application Status:** **Preparation Complete — Not Yet Submitted (Owner Action Required)**

> **Note:** Signing has **not** been claimed or approved yet. Review the mandatory owner blockers in Section 2 before submitting the application on https://signpath.org/.

---

## 1. Ready-to-Submit Project Details

| Field | Value |
| :--- | :--- |
| **Project Name** | ATHENA.IDE |
| **GitHub Repository** | https://github.com/Chandan11op/ATHENA.IDE |
| **Official Website / Download Page** | https://athenaide.vercel.app/download |
| **Primary Maintainer Context** | Open-source desktop IDE maintained by student contributors in India |
| **Project Description** | An offline-first, AI-assisted desktop Integrated Development Environment built on Electron, React, TypeScript, and Vite, powered by local Ollama models (`http://127.0.0.1:11434`). Provides sandboxed workspace exploration, Monaco Editor, integrated `@xterm/xterm` terminal, local Git workflows, and local AI coding assistance without cloud API keys or telemetry. |
| **Open-Source License** | **MISSING — OWNER MUST ADD BEFORE APPLYING** *(e.g. `MIT` or `Apache-2.0` via root `LICENSE` file and `package.json` `"license"` field — no proprietary or dual-licensed components)* |
| **Distribution Channels** | Official GitHub Releases (`https://github.com/Chandan11op/ATHENA.IDE/releases`) and live portal (`https://athenaide.vercel.app/download`) |
| **Target Artifacts to Sign** | `Athena.IDE.exe`, `resources/elevate.exe`, non-Microsoft Chromium/FFmpeg DLLs (`ffmpeg.dll`, `libEGL.dll`, `libGLESv2.dll`, `vk_swiftshader.dll`, `vulkan-1.dll`), NSIS setup installer (`Athena.IDE-*-win-x64-setup.exe`), NSIS uninstaller (`Uninstall Athena.IDE.exe`), and portable wrapper (`Athena.IDE-*-win-x64-portable.exe`) |
| **Build System** | GitHub Actions on GitHub-hosted **`windows-latest`** runners via [ci-and-release.yml](../.github/workflows/ci-and-release.yml) (`npm ci`, `npm run typecheck`, `npm test`, `npm run pack:win -- --publish never`) |
| **Signing Action Planned** | `signpath/github-action-submit-signing-request@v3` consuming artifacts uploaded via `actions/upload-artifact@v4` |
| **Security & Privacy Controls** | Context isolation (`contextIsolation: true`, `nodeIntegration: false`), strict IPC channel allowlisting, canonical workspace path containment, exclusion of `.env*` / private keys / credentials, `execFile` without shell interpolation, `safeStorage`-encrypted optional GitHub tokens, zero telemetry (documented in [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)) |

---

## 2. Mandatory Owner Prerequisites Before Submission

1. **Choose & Commit an OSI-Approved Open-Source License (Blocker #1):**
   - Currently, the repository has **no `LICENSE` file** (`GitHub API license: null`) and `package.json` has no `"license"` field.
   - SignPath Foundation strictly requires an OSI-approved license (such as MIT or Apache-2.0) covering the repository without commercial dual-licensing.
2. **Add SignPath Website Attribution Upon Approval (Requirement):**
   - Once SignPath Foundation approves ATHENA.IDE, SignPath requires the public download page (`website/src/pages/DownloadPage.tsx`) and/or `README.md` to clearly credit SignPath Foundation (*"Free code signing provided by SignPath Foundation"*). Do **not** publish that attribution until SignPath approves your project.
3. **Configure SignPath Policy for Electron + NSIS Nested Signing:**
   - Ensure the SignPath artifact configuration handles nested PE signing inside the NSIS installer/uninstaller (or stages unpacked PE files + NSIS uninstaller + outer `.exe` installers via SignPath's Electron/NSIS artifact policy so every shipped binary passes `scripts/signing/verify-win-signatures.ps1 -RequireSigned`).
4. **Configure GitHub Repository Secrets & Variables After Approval:**
   - **GitHub Secret:** `SIGNPATH_API_TOKEN`
   - **GitHub Variables:**
     - `SIGNPATH_ENABLED=true`
     - `SIGNPATH_ORGANIZATION_ID=<your-signpath-org-id>`
     - `SIGNPATH_PROJECT_SLUG=<your-signpath-project-slug>`
     - `SIGNPATH_SIGNING_POLICY_SLUG=release-signing`
     - `REQUIRE_SIGNED_RELEASE=true` *(recommended once live signing is configured so unsigned tags are blocked automatically)*
5. **Confirm Repository Security / Governance:**
   - Keep `main` protected by Pull Request reviews and CI status checks (`verify-desktop-and-website`), and restrict release signing approval policies inside SignPath to project maintainers.
