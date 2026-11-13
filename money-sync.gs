/**
 * Help Register - MONEY sync and backup through Google Drive.   (script version m2)
 * This is a different script from the Household one: its own web app address and its own key.
 * Paste this whole file into a new Google Apps Script project (see SETUP-MONEY-BACKUP.txt).
 * It stores your expense data as JSON files in YOUR Drive, in the folder below.
 */
const KEY = 'CHANGE-THIS-TO-YOUR-OWN-SECRET-KEY';      // choose a long random phrase; enter the same in the app
const FOLDER_NAME = 'Help Register Money Backup';
const KEEP_DAYS = 30;                                  // how many daily copies to keep
const VERSION = 'm2';

/** Open the web app address in a browser: you should see a short "running" message. */
function doGet() {
  return ContentService.createTextOutput('Help Register MONEY script is running (version ' + VERSION + '). Use the app to sync (this page needs no action).')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (KEY === 'CHANGE-THIS-TO-YOUR-OWN-SECRET-KEY' || req.key !== KEY) return out({ ok: false, error: 'Wrong key' });
    if (req.action === 'ping') return out({ ok: true, version: VERSION });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const folder = getFolder_();
      if (req.action === 'put') {
        if (!req.data || !Array.isArray(req.data.records)) return out({ ok: false, error: 'Nothing to save' });
        const text = JSON.stringify(req.data);
        write_(folder, 'money-latest.json', text);
        const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        write_(folder, 'money-' + day + '.json', text);
        prune_(folder);
        return out({ ok: true, file: 'money-' + day + '.json' });
      }
      if (req.action === 'sget') {          // two-way sync: read the shared copy (skipped if you already have this version)
        const doc = readSync_(folder);
        if (!doc) return out({ ok: true, ver: 0, same: Number(req.have || 0) === 0, data: null });
        if (Number(req.have || 0) === doc.ver) return out({ ok: true, ver: doc.ver, same: true });
        return out({ ok: true, ver: doc.ver, data: doc.data });
      }
      if (req.action === 'sput') {          // two-way sync: save the merged copy if nobody else saved first
        const cur = readSync_(folder), curVer = cur ? cur.ver : 0;
        if (Number(req.ver || 0) !== curVer) return out({ ok: false, conflict: true, error: 'conflict', ver: curVer });
        if (!req.data || !Array.isArray(req.data.mv)) return out({ ok: false, error: 'Nothing to save' });
        const doc = { ver: curVer + 1, savedAt: new Date().toISOString(), data: req.data };
        const text = JSON.stringify(doc);
        write_(folder, 'money-sync.json', text);
        const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        write_(folder, 'money-sync-' + day + '.json', text);   // one safety copy per day
        pruneSync_(folder);
        return out({ ok: true, ver: doc.ver });
      }
      if (req.action === 'get') {
        const name = /^money-(latest|\d{4}-\d{2}-\d{2})$/.test(String(req.name || 'latest').replace('.json', ''))
          ? String(req.name || 'latest').replace('.json', '') : 'latest';
        const it = folder.getFilesByName(name === 'latest' ? 'money-latest.json' : name + '.json');
        if (!it.hasNext()) return out({ ok: false, error: 'Backup not found' });
        return out({ ok: true, result: JSON.parse(it.next().getBlob().getDataAsString()) });
      }
      if (req.action === 'list') {
        const list = [], it = folder.getFiles();
        while (it.hasNext()) {
          const f = it.next(), n = f.getName();
          if (/^money-\d{4}-\d{2}-\d{2}\.json$/.test(n)) list.push({ name: n.replace('.json', ''), updated: f.getLastUpdated().toISOString() });
        }
        list.sort((a, b) => (a.name < b.name ? 1 : -1));
        return out({ ok: true, result: list });
      }
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
function write_(folder, name, text) {
  const it = folder.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(text);
  else folder.createFile(name, text, MimeType.PLAIN_TEXT);
}
function prune_(folder) {
  const files = [], it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^money-\d{4}-\d{2}-\d{2}\.json$/.test(f.getName())) files.push(f);
  }
  files.sort((a, b) => (a.getName() < b.getName() ? 1 : -1));
  files.slice(KEEP_DAYS).forEach(f => f.setTrashed(true));
}
function readSync_(folder) {
  const it = folder.getFilesByName('money-sync.json');
  return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null;
}
function pruneSync_(folder) {
  const files = [], it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^money-sync-\d{4}-\d{2}-\d{2}\.json$/.test(f.getName())) files.push(f);
  }
  files.sort((a, b) => (a.getName() < b.getName() ? 1 : -1));
  files.slice(KEEP_DAYS).forEach(f => f.setTrashed(true));
}
/** Run once from the editor (Run > authorizeOnce) so Google asks you to allow Drive access. */
function authorizeOnce() { getFolder_(); }
