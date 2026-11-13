# Household Help Register

Attendance, payments, planner and journal for household help. One HTML file, installable as an app.

## Use it online / install as an app (GitHub Pages)
After enabling Pages (Settings > Pages > Deploy from a branch > `main` / root), open
`https://YOUR-USERNAME.github.io/YOUR-REPO/` in Chrome or Edge and choose **Install app**.
Works on Windows and Android. Data stays on your own device (browser storage); it is not stored in this repo.

## Get the Windows .exe and Android .apk
Actions tab > **Build Windows installer** and **Build Android APK** > Run workflow (each separately). When it finishes, download
`windows-installer` and `android-apk` from the run's Artifacts. Pushing a tag such as `v1.0` also
publishes both files under Releases.

## Updating
Edit `index.html` in the repo root and commit. In `sw.js` change `VERSION` (`v1` to `v2`) so installed copies refresh.
The Windows and Android builds copy the root files automatically.

## Money module (expenses and income)
Open the app and switch to **Money** at the top. It records daily expenses and income across Cash, Debit Card,
Bank Account and All Accounts, with a dashboard, reports and settings.

**Your data is not in this repository.** Keep `expense-data.json` (your imported transactions) private. Do not commit it.
To load it on a device: Money > Settings > Import, backup and reset > choose the file.
Use Money > Settings > Download backup file regularly. The Help Register's payments and journal amounts are counted as expenses
(switch this off in Money > Settings > Payments from the Help Register).

## Navigation
The app opens on **Money**. Buttons: Money, Events Journal (Journal, Planner), Household (Attendance, Payments, People),
Holiday, Reports (Money, Household) and Settings (Money, Household).

## Money sync and backup through Google Drive
Follow `SETUP-MONEY-BACKUP.txt` once (paste `money-backup.gs` into Google Apps Script), then enter the address and key in
Settings > Money > Google Drive sync and backup. The header **Sync** button syncs Household, Money, or both.

## Icons
Money > Settings > Categories > Edit > Choose... offers 1,400+ built-in emoji and a search of 200,000+ modern icons from open icon sets
(Lucide, Tabler, Phosphor, Material, Fluent and more) through the Iconify website. Chosen icons are saved inside the app and work offline.
