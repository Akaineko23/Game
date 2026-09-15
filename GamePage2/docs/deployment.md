# Deployment

## Apps Script

1. Open `script.google.com` and create a project owned by the organiser account.
2. Add one Apps Script file for every `.gs` file from `apps-script/` and copy the contents.
3. Fill only the real Google document and schedule IDs in `Config.gs` and save.
4. Add the registration and Fienta values listed in `docs/fienta-setup.md` to **Project Settings → Script Properties**. Do not put secrets in `.gs` files.
5. Open **Deploy → New deployment** (or verify the current equivalent).
6. Select **Web app**.
7. Set execution to the owner account so private Docs and Sheets remain private.
8. Choose the narrowest access setting that still allows the public site and Fienta webhook to reach the web app.
9. Deploy and copy the base URL ending in `/exec`.
10. Put only that base URL in `assets/js/config.js`:

```js
apiUrl: 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec',
```

Do not append `action` or `language`; the local-content update command adds them when it reads Google Docs. Create a new deployment version after `.gs` changes when your chosen Apps Script workflow requires it.

Run `syncFientaRegistrations` once from the Apps Script editor to perform the initial import and approve access to the configured spreadsheet and external Fienta API. After verifying the result, run `installFientaSyncTrigger` once to create one hourly synchronization trigger.

## Frontend

Upload `index.html` and `assets/` to an HTTPS static host. Keep the directory structure unchanged. Test the deployed site again because cross-origin behaviour can differ from Live Server.

Run `node scripts/sync-content.mjs` before publishing whenever the Google Docs content changes. See `docs/content-sync.md`.
