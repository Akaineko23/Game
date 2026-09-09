# Deployment

## Apps Script

1. Open `script.google.com` and create a project owned by the organiser account.
2. Add one Apps Script file for every `.gs` file from `apps-script/` and copy the contents.
3. Fill only the real Google IDs in `Config.gs` and save.
4. Open **Deploy → New deployment** (or verify the current equivalent).
5. Select **Web app**.
6. Set execution to the owner account so private Docs and Sheets remain private.
7. Choose the narrowest access setting that still allows the public site and Fienta webhook to reach the web app.
8. Deploy and copy the base URL ending in `/exec`.
9. Put only that base URL in `assets/js/config.js`:

```js
apiUrl: 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec',
```

Do not append `action` or `language`; `api.js` adds them. Create a new deployment version after `.gs` changes when your chosen Apps Script workflow requires it.

## Frontend

Upload `index.html` and `assets/` to an HTTPS static host. Keep the directory structure unchanged. Test the deployed site again because cross-origin behaviour can differ from Live Server.
