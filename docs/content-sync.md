# Updating local page content

The published site reads the description, rules and news from `assets/js/local-content.js` and the approved public registration fields from `assets/js/local-registrations.js`. Estonian description, rules and news are also embedded between the marked blocks in `index.html`, so the initial page contains useful text before JavaScript runs. Normal page visits do not request Google Docs, Google Sheets or Apps Script.

Before publishing changes made in Google Docs:

1. Confirm that `assets/js/config.js` contains the deployed Apps Script `apiUrl`.
2. Install Node.js 18 or newer on the computer used for publishing.
3. From the `GamePageProv` directory run:

   ```text
   node scripts/sync-content.mjs
   ```

4. The command requests description, rules, news and public registrations for ET, RU and EN, removes unsupported tags and attributes, and validates every response before writing files.

Inline PNG, JPEG, GIF and WebP images from Google Docs are converted to content-hashed local files in `Pics/Synced`. A successful full sync removes only obsolete generated hash files from that directory. It never cleans `Pics/Icons`, `Pics/Map` or other manually managed assets. If an image is invalid, the synchronization stops before replacing the working local content.

To refresh only the three news documents without requesting or changing the description and rules, run:

```powershell
node scripts/sync-content.mjs --news-only
```

All three news responses are validated before either local file is replaced.

To refresh only the approved public registration list, run:

```powershell
node scripts/sync-content.mjs --registrations-only
```

All three language responses are validated before `assets/js/local-registrations.js` is replaced. Description, rules and news are not requested in this mode.

5. If any request is unavailable, empty or invalid, the command exits with an error before replacing the working local content.
6. Review the resulting page in all three languages, then publish `index.html` and the whole `assets/` directory.

Changes in Google Docs and Sheets become visible only after this command succeeds and the generated files are published. The GitHub workflow below performs that process periodically; the commands remain available as a manual fallback.

The repository workflow `.github/workflows/sync-local-content.yml` runs the full command every 30 minutes and can also be started manually. It commits only when generated files actually differ, so its own commits do not trigger another workflow run.

Deploy the updated Apps Script and configure all three `NEWS_DOCS` IDs before
running the command. Its published API must support `action=news`.
