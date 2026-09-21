# Updating local page content

The published site reads the description, rules and news from `assets/js/local-content.js`. Estonian description, rules and news are also embedded between the marked blocks in `index.html`, so the initial page contains useful text before JavaScript runs. Normal page visits do not request Google Docs or Apps Script.

Before publishing changes made in Google Docs:

1. Confirm that `assets/js/config.js` contains the deployed Apps Script `apiUrl`.
2. Install Node.js 18 or newer on the computer used for publishing.
3. From the `GamePage2` directory run:

   ```text
   node scripts/sync-content.mjs
   ```

4. The command requests description, rules and news for ET, RU and EN, removes unsupported tags and attributes, and validates every response before writing files.

To refresh only the three news documents without requesting or changing the description and rules, run:

```powershell
node scripts/sync-content.mjs --news-only
```

All three news responses are validated before either local file is replaced.

5. If any request is unavailable, empty or invalid, the command exits with an error before replacing the working local content.
6. Review the resulting page in all three languages, then publish `index.html` and the whole `assets/` directory.

Changes in Google Docs are not automatically visible on the public site. They appear only after this command succeeds and the generated files are published.

Deploy the updated Apps Script and configure all three `NEWS_DOCS` IDs before
running the command. Its published API must support `action=news`.
