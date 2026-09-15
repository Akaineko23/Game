# Updating local page content

The published site reads the description and rules from `assets/js/local-content.js`. Estonian content is also embedded between the marked blocks in `index.html`, so the initial page contains useful text before JavaScript runs. Normal page visits do not request Google Docs or Apps Script.

Before publishing changes made in Google Docs:

1. Confirm that `assets/js/config.js` contains the deployed Apps Script `apiUrl`.
2. Install Node.js 18 or newer on the computer used for publishing.
3. From the `GamePage2` directory run:

   ```text
   node scripts/sync-content.mjs
   ```

4. The command requests description and rules for ET, RU and EN, removes unsupported tags and attributes, and validates that every response is non-empty and contains headings.
5. If any language fails validation, the command exits with an error before replacing the working local content.
6. Review the resulting page in all three languages, then publish `index.html` and the whole `assets/` directory.

Changes in Google Docs are not automatically visible on the public site. They appear only after this command succeeds and the generated files are published.
