# Athena.IDE — Release Audit (`v0.2.0`)

**Audit Date:** 2026-11-28  
**Target Release:** `v0.2.0` (Windows 10/11 x64)  
**Repository:** `https://github.com/Chandan11op/ATHENA.IDE` (`origin` remote `Chandan11op/NOVA-IDE.git` redirects to `Chandan11op/ATHENA.IDE`)  
**Live Website:** `https://athenaide.vercel.app/`  
**Base Commit Audited:** `0dca542` (`main`)

---

## 1. Repository & Version Audit

| Item | Observed Value | Consistent? |
| :--- | :--- | :--- |
| `package.json` version | `0.2.0` | Yes |
| Electron `app.getVersion()` fallback | `0.2.0` | Yes |
| `electron-builder.yml` | Outputs `Athena.IDE-${version}-win-${arch}-setup.exe` & `-portable.exe` | Yes |
| Git tags (`git tag -l` / `git ls-remote --tags origin`) | None (`0` tags published) | Clean |
| GitHub Releases API (`GET /repos/Chandan11op/ATHENA.IDE/releases`) | `200 OK`, body `[]` (no releases published yet) | Confirmed |

---

## 2. Existing Artifacts Audited (`release/`)

Verified directly on disk:

| File | Size (Bytes) | Modified Timestamp | SHA-256 (Verified via `Get-FileHash`) |
| :--- | ---: | :--- | :--- |
| `Athena.IDE-0.2.0-win-x64-setup.exe` | `104,759,330` | `2026-11-28 19:14:07` | `a97f7fa0cebca7beb0f548bfdd3c7a5e0f6fdd4415709c63a36cb2ccde848573` |
| `Athena.IDE-0.2.0-win-x64-portable.exe` | `90,849,375` | `2026-11-28 19:17:39` | `eee78738611458d6750ca54a2da80f7237a2a72f4702e3b608636c8bc086f5aa` |
| `Athena.IDE-0.2.0-win-x64-setup.exe.blockmap` | `111,609` | `2026-11-28 19:14:15` | — |
| `latest.yml` | `365` | `2026-11-28 13:38:48` | — |
| `SHA256SUMS.txt` | `210` | `2026-11-28 13:38:49` | Matches both `.exe` files |

---

## 3. Root Cause of Live Website Error (`https://athenaide.vercel.app/download`)

### Observed Symptom
Loading `https://athenaide.vercel.app/download` in a browser displayed:  
`"Could not load release metadata: Unable to reach GitHub Releases API."`

### Verified Root Cause
In `website/src/backend/providers/github/githubReleaseProvider.ts` (line 114):
```ts
this.fetchImpl = config.fetchImpl ?? fetch;
```
Called on line 136 as `await this.fetchImpl(url, ...)`. In browser runtimes (unlike Node.js undici in Vitest), invoking `window.fetch` with `this` bound to the `GitHubReleaseProvider` instance throws **`TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation`**. The `catch (err)` block in `requestJson` converted that `TypeError` into `NETWORK_ERROR: 'Unable to reach GitHub Releases API.'`.

### Fix Applied
Bound the default fetch wrapper via `((input, init) => globalThis.fetch(input, init))` so browser `window.fetch` runs with global context while Vitest `globalThis.fetch` mocks remain testable.

---

## 4. Issues & Release Blockers Identified

1. **Browser `fetch` Illegal Invocation Bug:** Fixed in `githubReleaseProvider.ts` (must be deployed to Vercel via PR/merge to `main`).
2. **Release Notes Source Missing:** Created `docs/releases/0.2.0.md`.
3. **CI/CD Tag Publishing:** `.github/workflows/ci-and-release.yml` previously uploaded workflow artifacts only and did not attach releases to GitHub Releases when a `v*` tag is pushed. Updated workflow to create/attach GitHub Releases on `v*` tags after validation passes.
4. **Local `gh` CLI Not Installed:** `gh` CLI is not installed on this workstation; GitHub Release publication can proceed either via the tag-triggered GitHub Actions workflow (once merged and tagged) or authenticated REST API / manual upload.
5. **Runtime Limitations (Honest Scope):**
   - Executables are **unsigned** (`no code signing certificate configured`); Windows SmartScreen may warn on first run.
   - `ollama` and coding models are **not bundled** inside the installer; users install Ollama separately or via the in-app Setup Wizard (`winget` / `https://ollama.com/download`).
   - Physical network-disconnected offline testing remains unverified in this connected session.
