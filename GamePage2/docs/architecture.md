# Architecture

## Data flow

```text
Publishing command ──GET──> Apps Script ──> private Google Docs
Browser ──local files──────────> description and rules
Browser ──GET──> Apps Script ──> private Google Sheet (schedule)
Browser ──new-tab link──────────> Fienta checkout
Fienta  ──webhook/API──> Apps Script ──> private Google Sheet (registrations)
```

The browser receives only public content. Document and spreadsheet IDs stay in `apps-script/Config.gs`. Secrets belong in Apps Script Script Properties.

## Modules

- `assets/js/app.js`: language, navigation and page rendering.
- `assets/js/local-content.js`: generated ET/RU/EN description and rules.
- `assets/js/fienta.js`: official embed loader and availability callback.
- `apps-script/Code.gs`: small request router and safe errors.
- `ContentService.gs` and `ScheduleService.gs`: cached public reads.
- `FientaWebhookService.gs`: webhook verification and payload adapter boundary.
- `RegistrationRepository.gs`: idempotent ticket upsert.
- `PlayerNumberService.gs`: sequential four-digit numbers.
- `FientaApiService.gs`: paginated initial and periodic imports from the authenticated Fienta API.

## Important migration decision

The folder was empty, so there was no legacy form to remove. The new frontend contains no first-name, last-name or callsign form. Fienta owns registration and payment from the first version of this project.

## Webhook safety boundary

Fienta's OpenAPI document describes the JSON payloads but does not publish a signature header. The project therefore requires an organiser-generated `FIENTA_WEBHOOK_SECRET` in Script Properties and the same secret in the configured webhook URL query parameter. Periodic API synchronization remains authoritative for lifecycle changes such as cancellations and refunds that do not have a documented webhook type.
