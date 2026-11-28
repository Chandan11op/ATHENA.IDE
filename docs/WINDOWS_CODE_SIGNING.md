# ATHENA.IDE — Windows Code Signing & Smart App Control Analysis

**Audit Date:** 2026-11-28  
**Audited Release:** `v0.2.0` (`Athena.IDE-0.2.0-win-x64-setup.exe`, `Athena.IDE-0.2.0-win-x64-portable.exe`)  
**Repository:** https://github.com/Chandan11op/ATHENA.IDE  
**Website:** https://athenaide.vercel.app/  
**Target Platform:** Windows 10 / 11 (x64)

---

## 1. Authenticode Audit of Existing `v0.2.0` Artifacts

Every desktop binary component in `release/` and build configuration was inspected on Windows using `Get-AuthenticodeSignature`.

### Configuration Audited
- **`electron-builder.yml` (baseline prior to signing hardening):** Configured `win` targets (`nsis` x64 and `portable` x64) with no `signtoolOptions`, no `signExts` DLL rule, no `azureSignOptions`, and no post-package signature verification gate.
- **`package.json`:** Version `0.2.0`, using `electron-builder` `^26.18.0` and `electron` `^34.2.0`. **No `"license"` field** or root `LICENSE` file exists yet (flagged under Open-Source Licensing blockers below).
- **`.github/workflows/ci-and-release.yml`:** Built Windows artifacts (`npm run pack:win -- --publish never`) without a code-signing certificate provider or Authenticode verification gate.
- **NSIS Installer & Uninstaller:** Uses `electron-builder`'s built-in `installer.nsi` (since `oneClick: false`, `allowToChangeInstallationDirectory: true`). During packaging, `app-builder-lib` compiles a temporary uninstaller executable and invokes `packager.signIf(uninstallerPath)` before packaging `Athena.IDE-0.2.0-win-x64-setup.exe`. Because no signer was configured, both the NSIS installer and embedded uninstaller remained unsigned.
- **Workstation Inspection Context:** Registry check `HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy\VerifiedAndReputablePolicyState` returned `0` (Smart App Control is **Off** on the build workstation), which allowed local smoke tests to pass while end-user Windows 11 machines with Smart App Control enabled or in evaluation block execution.

### Binary Signature Status (`Get-AuthenticodeSignature`)

| Component | Path Audited | Signature Status | Subject / Publisher | Issuer | Timestamp |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Windows Setup Installer (NSIS) | `release\Athena.IDE-0.2.0-win-x64-setup.exe` | **`NotSigned`** | None | None | None |
| Windows Portable Executable | `release\Athena.IDE-0.2.0-win-x64-portable.exe` | **`NotSigned`** | None | None | None |
| Main Application Executable | `release\win-unpacked\Athena.IDE.exe` | **`NotSigned`** | None | None | None |
| Elevation Helper Executable | `release\win-unpacked\resources\elevate.exe` | **`NotSigned`** | None | None | None |
| Embedded NSIS Uninstaller | Generated inside NSIS setup stub (`Uninstall Athena.IDE.exe`) | **`NotSigned`** *(no signer configured during NSIS build)* | None | None | None |
| Electron FFmpeg Library | `release\win-unpacked\ffmpeg.dll` | **`NotSigned`** | None | None | None |
| ANGLE EGL Library | `release\win-unpacked\libEGL.dll` | **`NotSigned`** | None | None | None |
| ANGLE GLESv2 Library | `release\win-unpacked\libGLESv2.dll` | **`NotSigned`** | None | None | None |
| SwiftShader Vulkan Library | `release\win-unpacked\vk_swiftshader.dll` | **`NotSigned`** | None | None | None |
| Vulkan Loader DLL | `release\win-unpacked\vulkan-1.dll` | **`NotSigned`** | None | None | None |
| Direct3D Shader Compiler | `release\win-unpacked\d3dcompiler_47.dll` | **`Valid`** | `CN=Microsoft Corporation, ... C=US` | `CN=Microsoft Code Signing PCA 2010` | `CN=Microsoft Time-Stamp Service` |

> **Important Electron Packaging Finding:** By default, `electron-builder` only attempts to sign `.exe` binaries unless `win.signExts` includes `.dll`. When code signing is enabled without `.dll` inclusion, `ffmpeg.dll`, `libEGL.dll`, `libGLESv2.dll`, `vk_swiftshader.dll`, and `vulkan-1.dll` remain unsigned and can still cause Windows Smart App Control failures when loaded. At the same time, `d3dcompiler_47.dll` already carries a valid timestamped signature from Microsoft Corporation and must be preserved untouched rather than stripped/re-signed.

---

## 2. Exact Cause of Windows Smart App Control Block vs. SmartScreen

### Why Windows Smart App Control Blocks `Athena.IDE-0.2.0-win-x64-setup.exe`
1. `Athena.IDE-0.2.0-win-x64-setup.exe` and its packed payload binaries carry **zero digital signature** (`NotSigned`).
2. When **Smart App Control (SAC)** is enabled on clean Windows 11 installations, Windows enforces OS-level code integrity checks across executables, installers, uninstallers, and DLLs. Any binary that cannot be positively verified as safe by Microsoft's cloud security intelligence **and** does not carry a valid Authenticode signature chaining up to a Microsoft-trusted root CA is blocked with: *"Windows cannot verify the publisher"*.
3. Unlike Microsoft Defender SmartScreen, **Smart App Control provides no "Run anyway" override button** while active; users can only run signed or Microsoft-recognized software.

### Smart App Control Compatibility vs. SmartScreen Reputation

| Behavior | Windows Smart App Control (SAC) | Microsoft Defender SmartScreen |
| :--- | :--- | :--- |
| **Enforcement Mechanism** | Windows 11 kernel / Code Integrity check on `.exe`, `.dll`, scripts, and installers. | Download (`Mark of the Web`) & URL reputation warning dialog. |
| **Unsigned Executable (`v0.2.0`)** | **Hard-blocked** when SAC is active (no user override). | Shows `"Windows protected your PC"` / `"Unknown publisher"`, user can bypass via *More info -> Run anyway*. |
| **Self-Signed / Private Root Cert** | **Blocked / Ignored** — must chain to a Microsoft Trusted Root Program CA. | Still rejected / warned as untrusted publisher. |
| **Brand-New Public OV / OSS Cert** | **Passes cryptographic publisher verification** once every shipped `.exe`, `.dll`, installer, and uninstaller bears a valid timestamped SHA-256 signature from a trusted root. | **May still warn initially** (`Unknown publisher` / low download reputation) until download telemetry establishes reputation for that certificate/binary. |
| **Microsoft Store (MSIX)** | **Trusted** (signed directly by Microsoft Store pipeline). | **Trusted** immediately upon Store distribution. |

> **Accuracy Guarantee:** Even after configuring a valid OV or SignPath Foundation certificate, **SmartScreen warnings will not necessarily disappear on day one** — SmartScreen reputation accumulates per certificate and release over user downloads. Only publisher cryptographic trust (resolving the Smart App Control unverified-publisher block) is achieved immediately upon signing all executables, DLLs, installer, and uninstaller.

---

## 3. Signing Options Evaluated (India Student Open-Source Context)

All four options were verified against official 2025–2026 provider policies for an open-source student project maintained in India:

| Option | India Eligibility (Student / OSS) | Publisher Identity | Annual Cost | Limitations & Notes | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. SignPath Foundation** | **Yes** — worldwide eligibility, no US/EU entity required | SignPath Foundation (open-source signing) | **$0 (Free)** | Requires public repo, **OSI-approved `LICENSE` file** (missing today), GitHub-hosted runners (`windows-latest`), download-page attribution, manual application review | **Recommended #1** |
| **B1. Certum Open Source Code Signing** | **Yes** — global individual developer validation | `"Open Source Developer, <Legal Name>"` | ~**€49/yr** (SimplySign cloud HSM) or ~**€69/yr** (smartcard kit) | Individual KYC via government ID/passport + OSS check; non-INR billing (no GST invoice); OV reputation starts at zero | **Best Paid Fallback** |
| **B2. SSL.com eSigner / Sectigo / DigiCert OV** | **Yes** (cloud HSM or shipped token in India) | Verified Organization / Legal Entity | **$180/yr** (SSL.com eSigner) to **₹30k–41k/yr + GST** (Sectigo) / **$800–$1k+/yr** (DigiCert KeyLocker) | Requires formal registered legal entity / business docs; physical USB tokens cannot run directly in GitHub Actions without cloud HSM add-ons | Out of budget for student MVP |
| **C. Microsoft Artifact Signing** *(formerly Azure Trusted Signing)* | **No (Not Eligible in India for Public Trust)** | Organization or US/CA individual | $9.99/mo *(unavailable in India)* | Microsoft Learn limits Public Trust Individual validation to **US & Canada**, and Organization validation to US, Canada, EU, UK, AU, NZ, JP, KR, SG, CH, NO, IL — **India excluded** | **Not Available** |
| **D. Microsoft Store (MSIX)** | **Yes** (₹0 Individual fee waiver, KYC via ID + selfie) | Microsoft Store signature | **$0 / ₹0** | Only signs **Store** MSIX installs (does **not** sign GitHub `.exe` downloads); requires `appx` packaging and Partner Center **`runFullTrust` restricted capability approval** (terminal, Git, Ollama spawning) | **Good Secondary Channel** |

---

## 4. Pipeline & Packaging Architecture Implemented

Code-signing support and strict verification gates are now built into the repository without storing any private keys or credentials:

1. **`electron-builder.yml`:**
   - Enabled `win.verifyUpdateCodeSignature: true`.
   - Configured `win.signExts: [".dll"]` so `Athena.IDE.exe`, `resources/elevate.exe`, the NSIS setup installer, the portable executable, the dynamically built NSIS uninstaller, and non-Microsoft Electron DLLs (`ffmpeg.dll`, `libEGL.dll`, `libGLESv2.dll`, `vk_swiftshader.dll`, `vulkan-1.dll`) are routed through signing.
   - Configured `win.signtoolOptions`:
     - `signingHashAlgorithms: ["sha256"]`
     - `rfc3161TimeStampServer: "http://timestamp.digicert.com"`
     - `sign: "scripts/signing/sign-win-artifact.cjs"`
2. **`scripts/signing/sign-win-artifact.cjs`:**
   - Detects and **preserves** valid existing Microsoft Corporation Authenticode signatures (specifically `d3dcompiler_47.dll`) so Microsoft binaries are never stripped or overwritten.
   - Cleanly skips signing in `unsigned` / `signpath-staging` / credential-free local dev mode while **hard-failing** if `ATHENA_REQUIRE_CODE_SIGNING=true` or `forceCodeSigning` is active without valid credentials.
   - When configured with a real certificate (Windows Certificate Store thumbprint/subject, cloud/hardware CSP/KSP via `signtool.exe`, `CSC_LINK`/`WIN_CSC_LINK`, or `ATHENA_SIGNING_COMMAND`), enforces `/fd sha256` + RFC 3161 `/tr ... /td sha256` timestamping and immediately validates each signed file via `Get-AuthenticodeSignature` / `signtool verify /pa`.
3. **`scripts/signing/verify-win-signatures.ps1` (`npm run verify:win-sign`):**
   - Audits `Athena.IDE-*-win-*.exe`, `win-unpacked\Athena.IDE.exe`, `win-unpacked\resources\elevate.exe`, and all recursive `win-unpacked\**\*.dll` & `*.exe` files (plus optional `-InstalledDir` including `Uninstall Athena.IDE.exe`).
   - Fails immediately on broken/tampered signatures (`HashMismatch`, `NotTrusted`, untrusted chain) in all modes, and enforces zero unsigned or untimestamped non-Microsoft binaries when `-RequireSigned` / `ATHENA_REQUIRE_CODE_SIGNING=true` is enabled.
   - Emits machine-readable audit output (`windows-signing-report.json`) recording exact `signingStatus` and `smartAppControlCompatible` state.
4. **`.github/workflows/ci-and-release.yml`:**
   - Keeps least-privilege `contents: read` at workflow scope (`contents: write` scoped strictly to release publishing).
   - Supports **SignPath Foundation (`vars.SIGNPATH_ENABLED == 'true'`)** via `actions/upload-artifact@v4` + `signpath/github-action-submit-signing-request@v3`, **Certificate/`signtool` (`vars.ATHENA_SIGNING_PROVIDER == 'signtool'`)**, and **Unsigned Candidate builds** without falsely claiming Smart App Control compatibility.
   - Respects `vars.REQUIRE_SIGNED_RELEASE == 'true'` to block unsigned release publication once signing is enabled.

---

## 5. Preserving `v0.2.0` & Preparing Signed `v0.2.1`

- **`v0.2.0` Remains Preserved As-Is:** Existing published `v0.2.0` installers (`104,759,330` / `90,849,375` bytes) are **not** replaced or modified; the website explicitly displays `Unsigned` status for `v0.2.0` and never displays `"Verified Publisher"`.
- **Procedure for Future Signed `v0.2.1` Release (Once Certificate or SignPath Approved):**
  1. Owner resolves blockers below (adds OSI `LICENSE` + updates `package.json`, obtains SignPath approval or Certum SimplySign/OV credential, and configures repository secrets/variables).
  2. Bump `package.json` version from `0.2.0` to `0.2.1` and create `docs/releases/0.2.1.md`.
  3. Merge to `main` via Pull Request, tag `v0.2.1`, and let `.github/workflows/ci-and-release.yml` build, sign, run `verify-win-signatures.ps1 -RequireSigned`, generate `SHA256SUMS.txt` + `windows-signing-report.json`, and publish `v0.2.1`.
  4. Run Section 6 Windows Clean Environment Tests against the signed `v0.2.1` binaries before updating website attribution.

---

## 6. Windows Clean Environment Test Checklist (Run After Certificate Configuration)

Once a valid certificate or SignPath Foundation policy signs `v0.2.1` candidates, run and record results on a clean Windows 11 x64 host:

1. Run `.\scripts\signing\verify-win-signatures.ps1 -RequireSigned -JsonOutputPath release\windows-signing-report.json` against the unpacked binaries and installers.
2. Inspect `signtool verify /pa /all /v <file>` for `Athena.IDE-0.2.1-win-x64-setup.exe`, `Athena.IDE-0.2.1-win-x64-portable.exe`, `Athena.IDE.exe`, `elevate.exe`, and all Chromium/Electron DLLs.
3. Verify certificate issuer chains cleanly to a Microsoft Trusted Root CA, digest algorithm is `SHA256`, and RFC 3161 timestamp certificate is present.
4. On a **clean Windows 11 x64 environment with Smart App Control enabled**, download `Athena.IDE-0.2.1-win-x64-setup.exe` over HTTPS from GitHub Releases (preserving Mark of the Web), verify no Smart App Control block appears, complete NSIS installation, run `Get-AuthenticodeSignature` on `Uninstall Athena.IDE.exe` inside the install folder, launch `Athena.IDE.exe`, and cleanly uninstall.
5. Observe and document actual SmartScreen behavior (reputation-based prompt if new OV/OSS cert vs immediate pass).
