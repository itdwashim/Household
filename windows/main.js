const { app, BrowserWindow, Menu, shell, session, ipcMain, powerMonitor } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();
let win;

// Windows Hello check (your Windows 11 PIN, fingerprint or face) through the
// built-in Windows.Security.Credentials.UI.UserConsentVerifier API.
const PS = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  [void]$t.Wait(-1)
  $t.Result
}
$a = Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
if ("$a" -ne 'Available') { Write-Output "UNAVAILABLE:$a"; exit 0 }
$r = Await ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync('Unlock Household Help Register')) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
Write-Output "RESULT:$r"
`;
const PS_ENC = Buffer.from(PS, 'utf16le').toString('base64');

let verifying = false;
function verifyWindows() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('Windows PIN is only available on Windows.');
    if (verifying) return resolve('');
    verifying = true;
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', PS_ENC],
      { windowsHide: true, timeout: 120000 },
      (err, stdout) => {
        verifying = false;
        if (err) return resolve('Could not open Windows Hello.');
        const out = String(stdout).trim().split(/\r?\n/).pop() || '';
        if (out === 'RESULT:Verified') return resolve(true);
        if (out.startsWith('UNAVAILABLE:'))
          return resolve('Windows Hello is not set up. Open Settings > Accounts > Sign-in options and add a PIN.');
        if (out === 'RESULT:Canceled') return resolve('');
        if (out === 'RESULT:RetriesExhausted') return resolve('Too many wrong tries. Try again later.');
        resolve('Windows could not verify you.');
      });
  });
}

function create() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1100, height: 800, minWidth: 380, minHeight: 500,
    icon: path.join(__dirname, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // Allow the weather "use my location" button
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'geolocation'));
}

ipcMain.handle('auth:verify', () => verifyWindows());

app.whenReady().then(() => {
  create();
  // Lock the app too whenever Windows is locked (Win+L).
  powerMonitor.on('lock-screen', () => { if (win) win.webContents.send('app:lock'); });
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
