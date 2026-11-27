const { spawn } = require('child_process');
const electronPath = require('electron');

// Ensure ELECTRON_RUN_AS_NODE is cleared so Electron runs in GUI app mode
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
