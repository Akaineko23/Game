# Game Page v0.2

Multilingual ET/RU/EN page for one airsoft game. The frontend is plain HTML, CSS and JavaScript. Google Apps Script reads private Google Docs and Sheets. Registration, attendee data, tickets and payment are handled by Fienta.

## Current state

The site ships with local ET/RU/EN copies of the description and rules. Google Docs remain the editing source and are pulled into the site before publication with `node scripts/sync-content.mjs`. Fienta registration export remains disabled until the organiser adds the required Script Properties and test spreadsheet.

## Local preview

Open this folder with VS Code and use Live Server, or run any static HTTP server. Do not open `index.html` directly because browser module loading can be restricted for `file://` URLs.

## Configuration order

1. Add public game details and `fienta.eventUrl` to `assets/js/config.js`.
2. Follow `docs/google-setup.md`.
3. Follow `docs/fienta-setup.md`.
4. Follow `docs/content-sync.md` whenever Google Docs content changes.
4. Deploy Apps Script using `docs/deployment.md`.
5. Test every checklist item in `docs/testing.md`.

Never put Google credentials, organiser API keys or webhook secrets in frontend files.
