# Testing checklist

## Frontend

- Open through Live Server; confirm no horizontal scrolling.
- Switch ET/RU/EN and reload; confirm the choice persists.
- Test navigation, keyboard focus and mobile menu.
- Confirm all three Fienta buttons keep `target="_blank"` and the embedded checkout never opens.
- Confirm `embed.js` and the hidden status source are each created only once.
- Confirm placeholders are visible when integrations are not configured.

## Local Google content and schedule

- Run `node scripts/sync-content.mjs`, then test the local description, rules and news separately for ET, RU and EN with the Apps Script endpoint unavailable.
- Run `node scripts/sync-content.mjs --news-only` and confirm that all three news languages update together while description and rules remain byte-for-byte unchanged.
- Run `node scripts/sync-content.mjs --registrations-only` and confirm that only `assets/js/local-registrations.js` changes.
- Simulate one empty or failed language response and confirm the command preserves the existing generated content.
- Confirm headings create the rules contents.
- Confirm `VISIBLE = FALSE` rows are omitted.
- Test an empty schedule and an invalid language.
- Confirm `?action=health` reveals no IDs or secrets.

## Fienta and registration sync

- Use Fienta's safe/test mechanism where available; do not make a real charge accidentally.
- Verify ticket selection, attendee-level fields and checkout.
- Leave `REGISTRATIONS_SPREADSHEET_ID` unset and confirm synchronization writes nothing.
- Confirm first imported player numbers are 2000, 2001, and so on; repeat the import and verify the numbers and row count do not change.
- Change an order from unpaid to paid and verify the existing row changes without a duplicate.
- Cancel or refund a test ticket and verify its row is deleted; create another test ticket and verify the deleted number is not reused.
- Run the initial API import against a test spreadsheet and confirm one row per ticket.
- Send each official test webhook and confirm one row per ticket.
- Send the identical webhook again: no new row and no new Player Number may appear.
- Test one order containing several tickets: every ticket must receive a different four-digit number.
- Test all six configured ticket types and verify each Ticket Type ID maps to the correct side independently.
- Reorder columns in a test copy of both sheets and verify updates still resolve columns by header.
- Delete the Working sheet rows, run `rebuildGameSheet`, and verify they are rebuilt without an API request.
- Verify the public response and `local-registrations.js` contain exactly six approved fields, including Side, and no surname, email, phone, buyer data, Fienta ID, team or technical status.
- Insert, replace and remove an inline image in each Google Docs content type. Run the full synchronization and verify generated files appear or disappear only in `Pics/Synced`.
- Confirm `Pics/Icons` and `Pics/Map` remain byte-for-byte unchanged after image cleanup.
- Verify a permanent number of 1–5 digits is public, while longer or nonnumeric values become an empty public cell without changing the internal sheets.
- Test update, cancellation/refund and validation events only after their real payloads have been mapped.

Repeat API synchronization after changing attendee data, cancelling and refunding test tickets. Confirm the existing row and Player Number are updated rather than duplicated.
