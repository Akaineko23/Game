# Architecture

## Data flow

```text
Publishing command ──GET──> Apps Script ──> private Google Docs
Browser ──local files──────────> description, rules, news and public registrations
Browser ──new-tab link──────────> Fienta checkout
Fienta ──webhook/API──> Apps Script ──> Technical sheet ──> Working sheet
Working sheet ──public filter──> local-registrations.js ──> Browser
```

The browser receives only public content. Document and spreadsheet IDs stay in `apps-script/Config.gs`. Secrets belong in Apps Script Script Properties.

## Modules

- `assets/js/app.js`: language, navigation and page rendering.
- `assets/js/local-content.js`: generated ET/RU/EN description and rules.
- `assets/js/fienta.js`: official embed loader and availability callback.
- `apps-script/Code.gs`: small request router and safe errors.
- `ContentService.gs` and `ScheduleService.gs`: cached public reads.
- `FientaWebhookService.gs`: webhook verification and payload adapter boundary.
- `RegistrationRepository.gs`: header-based Technical/Working sheet upsert and rebuild.
- `RegistrationPublicService.gs`: fixed public allowlist and privacy filtering.
- `PlayerNumberService.gs`: sequential four-digit numbers.
- `FientaApiService.gs`: paginated initial and periodic imports from the authenticated Fienta API.

## Important migration decision

The folder was empty, so there was no legacy form to remove. The new frontend contains no first-name, last-name or callsign form. Fienta owns registration and payment from the first version of this project.

## Webhook safety boundary

Fienta's OpenAPI document describes the JSON payloads but does not publish a signature header. The project therefore requires an organiser-generated `FIENTA_WEBHOOK_SECRET` in Script Properties and the same secret in the configured webhook URL query parameter. Periodic API synchronization remains authoritative for lifecycle changes such as cancellations and refunds that do not have a documented webhook type.
