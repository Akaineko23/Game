# Testing checklist

## Frontend

- Open through Live Server; confirm no horizontal scrolling.
- Switch ET/RU/EN and reload; confirm the choice persists.
- Test navigation, keyboard focus and mobile menu.
- Test the Fienta link with embed enabled, disabled and JavaScript disabled.
- Confirm placeholders are visible when integrations are not configured.

## Google content and schedule

- Test description and rules separately for ET, RU and EN.
- Confirm headings create the rules contents.
- Confirm `VISIBLE = FALSE` rows are omitted.
- Test an empty schedule and an invalid language.
- Confirm `?action=health` reveals no IDs or secrets.

## Fienta and registration sync

- Use Fienta's safe/test mechanism where available; do not make a real charge accidentally.
- Verify ticket selection, attendee-level fields and checkout.
- Send an official test webhook and confirm one row per ticket.
- Send the identical webhook again: no new row and no new Player Number may appear.
- Test one order containing several tickets: every ticket must receive a different four-digit number.
- Test update, cancellation/refund and validation events only after their real payloads have been mapped.

The webhook checks cannot pass until verification and payload normalization are configured from a real Fienta test.
