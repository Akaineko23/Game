# Testing checklist

## Frontend

- Open through Live Server; confirm no horizontal scrolling.
- Switch ET/RU/EN and reload; confirm the choice persists.
- Test navigation, keyboard focus and mobile menu.
- Confirm all three Fienta buttons keep `target="_blank"` and the embedded checkout never opens.
- Confirm `embed.js` and the hidden status source are each created only once.
- Confirm placeholders are visible when integrations are not configured.

## Local Google content and schedule

- Run `node scripts/sync-content.mjs`, then test the local description and rules separately for ET, RU and EN with the Apps Script endpoint unavailable.
- Simulate one empty or failed language response and confirm the command preserves the existing generated content.
- Confirm headings create the rules contents.
- Confirm `VISIBLE = FALSE` rows are omitted.
- Test an empty schedule and an invalid language.
- Confirm `?action=health` reveals no IDs or secrets.

## Fienta and registration sync

- Use Fienta's safe/test mechanism where available; do not make a real charge accidentally.
- Verify ticket selection, attendee-level fields and checkout.
- Leave `REGISTRATIONS_SPREADSHEET_ID` unset and confirm synchronization writes nothing.
- Run the initial API import against a test spreadsheet and confirm one row per ticket.
- Send each official test webhook and confirm one row per ticket.
- Send the identical webhook again: no new row and no new Player Number may appear.
- Test one order containing several tickets: every ticket must receive a different four-digit number.
- Test update, cancellation/refund and validation events only after their real payloads have been mapped.

Repeat API synchronization after changing attendee data, cancelling and refunding test tickets. Confirm the existing row and Player Number are updated rather than duplicated.
