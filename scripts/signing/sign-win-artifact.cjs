'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function inspectSignatureWindows(filePath) {
  const script =
    "$s = Get-AuthenticodeSignature -LiteralPath $env:ATHENA_SIGN_TARGET; " +
    "$subj = if ($s.SignerCertificate) { $s.SignerCertificate.Subject } else { '' }; " +
    "$ts = if ($s.TimeStamperCertificate) { $s.TimeStamperCertificate.Subject } else { '' }; " +
    'Write-Output ("{0}|{1}|{2}" -f $s.Status, $subj, $ts)';

  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, ATHENA_SIGN_TARGET: filePath },
    encoding: 'utf8',
    windowsHide: true,
  });

  const [status = '', subject = '', timestampSubject = ''] = out.trim().split('|');
  return { status, subject, timestampSubject };
}

function findSignToolExe() {
  if (process.env.SIGNTOOL_PATH && fs.existsSync(process.env.SIGNTOOL_PATH)) {
    return process.env.SIGNTOOL_PATH;
  }

  try {
    const whereOut = execFileSync('where.exe', ['signtool.exe'], { encoding: 'utf8', windowsHide: true })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (whereOut && fs.existsSync(whereOut)) {
      return whereOut;
    }
  } catch {
    // Ignore PATH miss and probe Windows Kits installation directories below.
  }

  const kitsBase = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';
  if (fs.existsSync(kitsBase)) {
    const versions = fs
      .readdirSync(kitsBase)
      .filter((entry) => /^\d+\.\d+/.test(entry))
      .sort()
      .reverse();
    for (const ver of versions) {
      const candidate = path.join(kitsBase, ver, 'x64', 'signtool.exe');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function isMicrosoftSigned(sigInfo) {
  return (
    sigInfo.status === 'Valid' &&
    sigInfo.subject.startsWith('CN=Microsoft Corporation') &&
    Boolean(sigInfo.timestampSubject)
  );
}

/**
 * Custom electron-builder Windows Authenticode signer.
 * - Preserves existing valid Microsoft signatures (e.g. d3dcompiler_47.dll).
 * - Never fabricates self-signed certs or emits private keys/passwords in logs.
 * - Fails loudly when ATHENA_REQUIRE_CODE_SIGNING=true and no legitimate signer is configured.
 */
async function signWindowsArtifact(configuration, packager) {
  const targetPath = configuration && configuration.path;
  if (!targetPath || !fs.existsSync(targetPath)) {
    throw new Error(`[signing] Target artifact missing: ${String(targetPath)}`);
  }

  const fileName = path.basename(targetPath);
  const signingMode = (process.env.ATHENA_SIGNING_MODE || '').trim().toLowerCase();
  const strictRequired =
    process.env.ATHENA_REQUIRE_CODE_SIGNING === 'true' || Boolean(packager && packager.forceCodeSigning);

  if (process.platform === 'win32') {
    const existing = inspectSignatureWindows(targetPath);
    if (isMicrosoftSigned(existing)) {
      console.log(`[signing] Preserving existing valid Microsoft Authenticode signature on ${fileName}`);
      return;
    }
  }

  if (signingMode === 'signpath-staging') {
    console.log(`[signing] SignPath staging build: leaving ${fileName} unsigned for SignPath CI artifact submission.`);
    return;
  }

  if (signingMode === 'unsigned') {
    if (strictRequired) {
      throw new Error(
        '[signing] Refusing unsigned mode because strict code signing is required (ATHENA_REQUIRE_CODE_SIGNING=true).'
      );
    }
    console.log(`[signing] Unsigned build mode enabled; skipping ${fileName}.`);
    return;
  }

  const customCommand = (process.env.ATHENA_SIGNING_COMMAND || '').trim();
  const certThumbprint = (process.env.ATHENA_CERT_THUMBPRINT || '').trim();
  const certSubject = (process.env.ATHENA_CERT_SUBJECT || '').trim();
  const hasCscInfo = Boolean(configuration && configuration.cscInfo);

  if (!customCommand && !certThumbprint && !certSubject && !hasCscInfo) {
    if (strictRequired) {
      throw new Error(
        `[signing] Strict code signing failed for ${fileName}: no certificate or signing provider configured.`
      );
    }
    console.log(`[signing] No signing credentials configured; skipping ${fileName} (build remains unsigned).`);
    return;
  }

  if (customCommand) {
    execFileSync(customCommand, [targetPath], {
      env: { ...process.env, ATHENA_SIGN_TARGET: targetPath },
      stdio: 'inherit',
      windowsHide: true,
    });
  } else {
    if (process.platform !== 'win32') {
      throw new Error('[signing] Native Windows signtool.exe signing requires a Windows runner.');
    }

    const signtool = findSignToolExe();
    if (!signtool) {
      throw new Error(
        '[signing] Windows SDK signtool.exe not found. Set SIGNTOOL_PATH or install Windows 10/11 SDK.'
      );
    }

    const timestampUrl = (process.env.ATHENA_TIMESTAMP_URL || 'http://timestamp.digicert.com').trim();
    const args = ['sign', '/fd', 'sha256', '/tr', timestampUrl, '/td', 'sha256'];

    if (configuration.name) {
      args.push('/d', String(configuration.name));
    }
    args.push('/du', 'https://athenaide.vercel.app/');

    if (configuration.isNest) {
      args.push('/as');
    }

    if (certThumbprint) {
      args.push('/sha1', certThumbprint);
      if (process.env.ATHENA_USE_MACHINE_STORE === 'true') {
        args.push('/sm');
      }
      if (process.env.ATHENA_CSP_NAME) {
        args.push('/csp', process.env.ATHENA_CSP_NAME.trim());
      }
      if (process.env.ATHENA_KEY_CONTAINER) {
        args.push('/kc', process.env.ATHENA_KEY_CONTAINER.trim());
      }
    } else if (certSubject) {
      args.push('/n', certSubject);
      if (process.env.ATHENA_USE_MACHINE_STORE === 'true') {
        args.push('/sm');
      }
    } else if (configuration.cscInfo && configuration.cscInfo.file) {
      args.push('/f', configuration.cscInfo.file);
      if (configuration.cscInfo.password) {
        args.push('/p', configuration.cscInfo.password);
      }
    } else if (configuration.cscInfo && configuration.cscInfo.thumbprint) {
      args.push('/sha1', configuration.cscInfo.thumbprint);
      if (configuration.cscInfo.isLocalMachineStore) {
        args.push('/sm');
      }
    } else if (typeof configuration.computeSignToolArgs === 'function') {
      const generated = configuration.computeSignToolArgs(true);
      execFileSync(signtool, generated, { stdio: 'inherit', windowsHide: true });
      return;
    }

    args.push(targetPath);
    execFileSync(signtool, args, { stdio: 'inherit', windowsHide: true });
  }

  if (process.platform === 'win32') {
    const postCheck = inspectSignatureWindows(targetPath);
    if (postCheck.status !== 'Valid' || !postCheck.timestampSubject) {
      throw new Error(
        `[signing] Post-sign verification failed for ${fileName}: status=${postCheck.status}, timestamp=${postCheck.timestampSubject || 'missing'}`
      );
    }
    console.log(`[signing] Verified valid SHA-256 + timestamp signature on ${fileName}`);
  }
}

module.exports = signWindowsArtifact;
module.exports.default = signWindowsArtifact;
module.exports.isMicrosoftSigned = isMicrosoftSigned;
