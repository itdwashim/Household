/**
 * Help Register - HOUSEHOLD sync through Google Drive.   (script version h2)
 * Paste this whole file into a NEW Google Apps Script project (script.google.com > New project).
 * This is a different script from the Money one. Each has its own web app address and its own key.
 * Data is stored as JSON files in YOUR Drive, in the folder named below.
 */
const KEY = 'CHANGE-THIS-TO-YOUR-OWN-HOUSEHOLD-KEY';   // long random phrase; type the same in Settings > Household > Sync across devices
const FOLDER_NAME = 'Help Register Household Sync';
const KEEP_DAYS = 30;                                  // daily safety copies to keep
const VERSION = 'h3';

/** Open the web app address in a browser: you should see this "running" message. */
function doGet() {
  return ContentService.createTextOutput('Help Register HOUSEHOLD script is running (version ' + VERSION + '). Use the app to sync; this page needs no action.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (KEY === 'CHANGE-THIS-TO-YOUR-OWN-HOUSEHOLD-KEY' || req.key !== KEY) return out({ ok: false, error: 'Wrong key' });
    if (req.action === 'ping') return out({ ok: true, version: VERSION });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const folder = getFolder_();
      const cur = read_(folder);                       // stored data or null
      const curTs = cur && cur.ts ? Number(cur.ts) : 0;

      if (req.action === 'get') {
        return out({ ok: true, result: cur || {} });   // the app treats {} (no ts) as "nothing stored yet"
      }
      if (req.action === 'set') {
        const d = req.data;
        if (!d || typeof d !== 'object' || Array.isArray(d)) return out({ ok: false, error: 'Nothing to save' });
        // Someone else saved since this device last synced: send their copy back so the app can merge. (ok must stay true.)
        if (Number(req.expect || 0) !== curTs) return out({ ok: true, conflict: true, result: cur || {} });
        const text = JSON.stringify(d);
        write_(folder, 'household-latest.json', text);
        const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        write_(folder, 'household-' + day + '.json', text);   // one safety copy per day
        prune_(folder);
        return out({ ok: true });
      }
      if (req.action === 'bput' || req.action === 'blist' || req.action === 'bget') return backup_(folder, req);
      return out({ ok: false, error: 'Unknown action' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
function read_(folder) {
  const it = folder.getFilesByName('household-latest.json');
  return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null;
}
function write_(folder, name, text) {
  const it = folder.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(text);
  else folder.createFile(name, text, MimeType.PLAIN_TEXT);
}
function prune_(folder) {
  const files = [], it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^household-\d{4}-\d{2}-\d{2}\.json$/.test(f.getName())) files.push(f);
  }
  files.sort((a, b) => (a.getName() < b.getName() ? 1 : -1));
  files.slice(KEEP_DAYS).forEach(f => f.setTrashed(true));
}
/* ---- Combined / Household backups kept as files in Drive (used by "Backup and restore" in the app) ---- */
function backupName_(n) { return n === 'all' || n === 'household' ? n : null; }
function backup_(folder, req) {
  const n = backupName_(req.name);
  if (!n) return out({ ok: false, error: 'Unknown backup name' });
  const re = new RegExp('^backup-' + n + '-(\\d{4}-\\d{2}-\\d{2})\\.json$');
  if (req.action === 'bput') {
    if (!req.data || typeof req.data !== 'object') return out({ ok: false, error: 'Nothing to save' });
    const text = JSON.stringify(req.data);
    const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    write_(folder, 'backup-' + n + '-latest.json', text);
    write_(folder, 'backup-' + n + '-' + day + '.json', text);      // one safety copy per day
    const files = [], it = folder.getFiles();
    while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) files.push(f); }
    files.sort((a, b) => (a.getName() < b.getName() ? 1 : -1));
    files.slice(KEEP_DAYS).forEach(f => f.setTrashed(true));
    return out({ ok: true, file: 'backup-' + n + '-' + day + '.json' });
  }
  if (req.action === 'blist') {
    const list = [], it = folder.getFiles();
    while (it.hasNext()) { const f = it.next(), m = re.exec(f.getName()); if (m) list.push({ name: m[1], updated: f.getLastUpdated().toISOString() }); }
    list.sort((a, b) => (a.name < b.name ? 1 : -1));
    return out({ ok: true, result: list });
  }
  const want = String(req.file || 'latest');
  const fname = want === 'latest' ? 'backup-' + n + '-latest.json' : (/^\d{4}-\d{2}-\d{2}$/.test(want) ? 'backup-' + n + '-' + want + '.json' : null);
  if (!fname) return out({ ok: false, error: 'Bad file name' });
  const it2 = folder.getFilesByName(fname);
  if (!it2.hasNext()) return out({ ok: false, error: 'Backup not found' });
  return out({ ok: true, result: JSON.parse(it2.next().getBlob().getDataAsString()) });
}

/** Run once from the editor (Run > authorizeOnce) so Google asks you to allow Drive access. */
function authorizeOnce() { getFolder_(); }
