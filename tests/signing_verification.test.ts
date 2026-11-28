import { describe, expect, it, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const signModule = require('../scripts/signing/sign-win-artifact.cjs');

describe('Windows code-signing helper & verification pipeline', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('recognizes valid Microsoft Corporation signatures as preserved OS binaries', () => {
    expect(
      signModule.isMicrosoftSigned({
        status: 'Valid',
        subject: 'CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US',
        timestampSubject: 'CN=Microsoft Time-Stamp Service',
      })
    ).toBe(true);

    expect(
      signModule.isMicrosoftSigned({
        status: 'Valid',
        subject: 'CN=Microsoft Corporation, O=Microsoft Corporation',
        timestampSubject: '',
      })
    ).toBe(false);

    expect(
      signModule.isMicrosoftSigned({
        status: 'NotSigned',
        subject: '',
        timestampSubject: '',
      })
    ).toBe(false);
  });

  it('fails loudly when strict signing is enabled without credentials', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-sign-test-'));
    const dummyExe = path.join(tmpDir, 'sample.exe');
    fs.writeFileSync(dummyExe, 'MZ-unsigned-placeholder');

    process.env.ATHENA_REQUIRE_CODE_SIGNING = 'true';
    delete process.env.ATHENA_SIGNING_MODE;
    delete process.env.ATHENA_CERT_THUMBPRINT;
    delete process.env.ATHENA_CERT_SUBJECT;
    delete process.env.ATHENA_SIGNING_COMMAND;

    await expect(signModule({ path: dummyExe }, { forceCodeSigning: true })).rejects.toThrow(
      /Strict code signing failed/i
    );

    process.env.ATHENA_SIGNING_MODE = 'unsigned';
    await expect(signModule({ path: dummyExe }, { forceCodeSigning: false })).rejects.toThrow(
      /Refusing unsigned mode/i
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips cleanly in unsigned or signpath-staging mode when strict mode is disabled', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-sign-stage-'));
    const dummyExe = path.join(tmpDir, 'sample.exe');
    fs.writeFileSync(dummyExe, 'MZ-unsigned-placeholder');

    process.env.ATHENA_REQUIRE_CODE_SIGNING = 'false';
    process.env.ATHENA_SIGNING_MODE = 'signpath-staging';
    await expect(signModule({ path: dummyExe }, { forceCodeSigning: false })).resolves.toBeUndefined();

    process.env.ATHENA_SIGNING_MODE = 'unsigned';
    await expect(signModule({ path: dummyExe }, { forceCodeSigning: false })).resolves.toBeUndefined();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it(
    'audits real Windows binaries accurately via verify-win-signatures.ps1 when present',
    () => {
    const releaseDir = path.resolve('release');
    const winUnpacked = path.join(releaseDir, 'win-unpacked');
    if (process.platform !== 'win32' || !fs.existsSync(winUnpacked)) {
      return;
    }

    const tmpOut = path.join(os.tmpdir(), `athena-verify-${Date.now()}.json`);
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.resolve('scripts/signing/verify-win-signatures.ps1'),
        '-ReleaseDir',
        releaseDir,
        '-JsonOutputPath',
        tmpOut,
      ],
      { encoding: 'utf8', windowsHide: true }
    );

    const report = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
    fs.rmSync(tmpOut, { force: true });

    expect(report.totalFilesChecked).toBeGreaterThanOrEqual(7);
    const msftDll = report.files.find((f: { fileName: string }) => f.fileName === 'd3dcompiler_47.dll');
    expect(msftDll?.microsoftSigned).toBe(true);
    expect(msftDll?.status).toBe('Valid');

    const mainExe = report.files.find((f: { fileName: string }) => f.fileName === 'Athena.IDE.exe');
    expect(mainExe?.status).toBe('NotSigned');
    expect(report.signingStatus).toBe('unsigned');
    expect(report.smartAppControlCompatible).toBe(false);

    // Strict mode must exit non-zero when unsigned binaries are checked
    expect(() =>
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.resolve('scripts/signing/verify-win-signatures.ps1'),
          '-ReleaseDir',
          releaseDir,
          '-RequireSigned',
        ],
        { encoding: 'utf8', windowsHide: true, stdio: 'pipe' }
      )
    ).toThrow();
  },
    30_000
  );
});
