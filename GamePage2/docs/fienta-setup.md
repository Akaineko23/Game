# Fienta setup

These steps follow Fienta's current public help. Interface labels can change; verify the current location in the Fienta organiser interface whenever a label differs.

## Event and tickets

1. Create or open an organiser account and complete the verification required by Fienta.
2. Create an event and add Estonian, Russian and English content where appropriate.
3. Set the real date and venue.
4. Create ticket types. A game side can be a separate ticket type, giving it an independent price and capacity.
5. Configure Early Bird, Regular or Late sales using Fienta ticket types and sale periods. Game Page does not calculate prices.

## Registration form

In the event view, current Fienta help places this under **Edit → Order form**. Add First name, Last name and Callsign. Collect attendee-specific answers separately for each ticket, not once per order, when one order can contain multiple players. Fienta already collects the buyer email for confirmation; decide whether each attendee also needs an individual email.

## Public event URL and embed

1. Copy the published Fienta event URL.
2. Put it in `assets/js/config.js` as `fienta.eventUrl`.
3. Keep `embedEnabled: true` to load `https://fienta.com/embed.js`.
4. Test the normal link first. Then test that the same link opens the Fienta overlay with JavaScript enabled.
5. With JavaScript disabled, the anchor remains an ordinary link. Before publishing, replace the generic HTML fallback URL with the same real event URL if true no-JavaScript fallback is required.

The official availability callback supports: `true` for more than 50 tickets, `1..50` for an exact remaining count, `0` for sold out and `false` for sale ended.

## Webhook

1. Current public help places webhooks under **Settings → Integration**. Verify the current location in Fienta organiser interface.
2. Use the deployed Apps Script `/exec` URL.
3. Enable purchase/registration, registration update and validation events that exist in the current interface.
4. Use Fienta's test button and inspect its displayed sample payload.
5. Compare the current official API documentation for the verification/authentication mechanism.
6. Implement that exact mechanism in `verifyFientaWebhook_()` and map the observed fields in `normalizeFientaWebhook_()`.
7. If the official mechanism requires secrets, store only placeholders such as `FIENTA_WEBHOOK_SECRET` or `FIENTA_API_KEY` in **Apps Script → Project Settings → Script Properties**. Never commit real values.
8. Send a test and inspect **Apps Script → Executions** plus the private Registrations sheet.

Until steps 4–6 are complete, the endpoint returns `WEBHOOK_VERIFICATION_NOT_CONFIGURED` and writes nothing.

## API

Fienta's public events API can list published public events and does not belong in a secret configuration. Organiser-level APIs may require an API key; keep that key in Script Properties and never in frontend JavaScript.
