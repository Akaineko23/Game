# Architecture

## Data flow

```text
Browser ──GET──> Apps Script ──> private Google Docs (description and rules)
Browser ──GET──> Apps Script ──> private Google Sheet (schedule)
Browser ──link/embed────────────> Fienta checkout
Fienta  ──webhook──> Apps Script ──> private Google Sheet (registrations)
```

The browser receives only public content. Document and spreadsheet IDs stay in `apps-script/Config.gs`. Secrets belong in Apps Script Script Properties.

## Modules

- `assets/js/app.js`: language, navigation and page rendering.
- `assets/js/api.js`: GET requests to Apps Script.
- `assets/js/fienta.js`: official embed loader and availability callback.
- `apps-script/Code.gs`: small request router and safe errors.
- `ContentService.gs` and `ScheduleService.gs`: cached public reads.
- `FientaWebhookService.gs`: webhook verification and payload adapter boundary.
- `RegistrationRepository.gs`: idempotent ticket upsert.
- `PlayerNumberService.gs`: sequential four-digit numbers.

## Important migration decision

The folder was empty, so there was no legacy form to remove. The new frontend contains no first-name, last-name or callsign form. Fienta owns registration and payment from the first version of this project.

## Webhook safety boundary

Fienta's public help confirms webhooks and test payloads, but the exact verification contract was not available in the reviewed public help. `verifyFientaWebhook_()` therefore fails closed. Enable processing only after comparing the current official API documentation and a real test payload from the organiser account. Never replace it with an invented signature scheme.
