# Game Page v0.2

Multilingual ET/RU/EN page for one airsoft game. The frontend is plain HTML, CSS and JavaScript. Google Apps Script reads private Google Docs and Sheets. Registration, attendee data, tickets and payment are handled by Fienta.

## Current state

The site runs locally with safe placeholders. Description, rules, schedule and Fienta checkout become active only after real IDs and URLs are configured. The Fienta webhook intentionally rejects requests until the official verification mechanism and a real test payload have been inspected.

## Local preview

Open this folder with VS Code and use Live Server, or run any static HTTP server. Do not open `index.html` directly because browser module loading can be restricted for `file://` URLs.

## Configuration order

1. Add public game details and `fienta.eventUrl` to `assets/js/config.js`.
2. Follow `docs/google-setup.md`.
3. Follow `docs/fienta-setup.md`.
4. Deploy Apps Script using `docs/deployment.md`.
5. Test every checklist item in `docs/testing.md`.

Never put Google credentials, organiser API keys or webhook secrets in frontend files.
