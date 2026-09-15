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
3. The three visible ticket buttons remain ordinary links with `target="_blank"` and do not open an overlay.
4. The frontend loads `https://fienta.com/embed.js` against a hidden status-only link so the official availability callback can update the HERO status.
5. With JavaScript disabled, the anchor remains an ordinary link. Before publishing, replace the generic HTML fallback URL with the same real event URL if true no-JavaScript fallback is required.

The official availability callback supports: `true` for more than 50 tickets, `1..50` for an exact remaining count, `0` for sold out and `false` for sale ended. It does not provide a documented count of paid tickets, so the site never derives or displays an estimated sold count.

## Webhook

1. Current public help places webhooks under **Settings → Integration**. Verify the current location in Fienta organiser interface.
2. Generate a long random value for `FIENTA_WEBHOOK_SECRET` and save it in Apps Script **Project Settings → Script Properties**.
3. Use the deployed URL in this form: `https://script.google.com/macros/s/DEPLOYMENT_ID/exec?secret=YOUR_SECRET`.
4. Enable the documented order-completion, registration-form and ticket-validation webhooks.
5. Keep the URL private and rotate the secret if it is exposed.
6. Use Fienta's test button and inspect **Apps Script → Executions** plus the private registrations sheet.

Fienta's OpenAPI document describes webhook bodies but does not specify a signature header. The secret URL parameter is therefore required by this project instead of an invented signature header. Cancellation and refund states are reconciled by the authenticated API synchronization described below.

## API synchronization

Create these Script Properties:

- `REGISTRATIONS_SPREADSHEET_ID`: ID of the Google spreadsheet chosen by the organiser.
- `FIENTA_API_TOKEN`: organiser-level API key from Fienta **Settings → Integration**.
- `FIENTA_ORGANIZER_ID`: numeric organiser ID.
- `FIENTA_EVENT_ID`: numeric event ID.
- `FIENTA_WEBHOOK_SECRET`: the random webhook URL secret described above.
- `FIENTA_TICKET_TYPE_SIDE_MAP`: JSON object mapping ticket-type IDs or exact titles to game sides, for example `{"142835":"Alliance","142836":"Undertail"}`. Unmapped ticket types remain blank.

Optional attendee-field mappings are `FIENTA_FIRST_NAME_FIELD`, `FIENTA_LAST_NAME_FIELD`, `FIENTA_CALLSIGN_FIELD`, and `FIENTA_EMAIL_FIELD`. Their defaults are `first_name`, `last_name`, `callsign`, and `email`. Change them only when the custom-field names shown by Fienta differ.

After adding all Apps Script files and properties:

1. Run `syncFientaRegistrations` manually from the Apps Script editor and approve Spreadsheet and external-request permissions. This imports existing orders and tickets using the documented paginated API.
2. Verify several rows, including an order containing multiple tickets. The unique Fienta ticket code is used for updates, so repeated imports do not create duplicates.
3. Run `installFientaSyncTrigger` once to create a single hourly synchronization trigger.
4. Deploy a new web-app version and configure the three webhook types.

Until `REGISTRATIONS_SPREADSHEET_ID` is set, synchronization stops with `REGISTRATIONS_SPREADSHEET_NOT_CONFIGURED` and does not open or write any spreadsheet. API tokens and attendee data are never returned by the public site API.
