# Google setup

## Description and rules documents

1. Create six Google Docs: Description ET/RU/EN and Rules ET/RU/EN.
2. In a document URL such as `https://docs.google.com/document/d/DOCUMENT_ID/edit`, copy the value between `/d/` and `/edit`.
3. Paste each ID into the matching `DESCRIPTION_DOCS` or `RULES_DOCS` entry in `apps-script/Config.gs`.
4. Keep the documents private. The Apps Script project should run as the same owner or an account that already has access.
5. Use Heading 1–3 for sections. The frontend builds the rules contents from returned headings.
6. After deployment, test:
   - `?action=content&language=et`
   - `?action=content&language=ru`
   - `?action=content&language=en`

The browser never sends a Document ID, so it cannot request an arbitrary Drive file.

## Schedule sheet

1. Create a private Google Sheet.
2. Rename one tab to `Schedule`.
3. Add headers: `DATE`, `START_TIME`, `END_TIME`, `TITLE_ET`, `TITLE_RU`, `TITLE_EN`, `VISIBLE`.
4. Add one schedule item per row. Use `FALSE` in `VISIBLE` to hide a row; any other value remains visible.
5. Copy the Spreadsheet ID between `/d/` and `/edit` in its URL.
6. Paste it into `SCHEDULE_SHEET_ID` in `Config.gs`.
7. Test `?action=schedule&language=et`, then repeat for `ru` and `en`.

## Registrations sheet

1. Create another private Google Sheet and a tab named `Registrations`.
2. You may leave it empty: the script creates the approved header row on the first verified webhook.
3. Copy its Spreadsheet ID into `REGISTRATION_SHEET_ID`.
4. Keep sharing restricted. Apps Script writes as the deployment owner; visitors must never receive public write access.
5. Expected columns are defined once in `RegistrationRepository.gs`.
