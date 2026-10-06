# Настройка регистраций и автоматического обновления

Эта инструкция описывает фактическую реализацию `GamePageProv`. Секреты хранятся только в Apps Script Script Properties и не добавляются в GitHub.

## 1. Подготовка Google Sheets

1. Откройте Google Drive и таблицу регистраций.
2. Убедитесь, что в ней есть лист `Registrations`. Это Technical sheet и источник истины.
3. Скопируйте ID таблицы из URL: часть между `/d/` и `/edit`.
4. Лист `Game Registrations` создавать вручную не обязательно: скрипт создаст его при первой синхронизации.
5. После запуска при желании скройте в Working sheet колонку `Fienta Ticket ID`. Не удаляйте её: это ключ связи.

## 2. Обновление Google Apps Script

1. Откройте Apps Script, который обслуживает тестовую страницу.
2. Замените файлы проекта файлами из папки `apps-script/`, включая `RegistrationPublicService.gs`.
3. Нажмите **Project Settings → Script Properties**.
4. Добавьте:
   - `REGISTRATIONS_SPREADSHEET_ID` — ID таблицы из шага 1;
   - `FIENTA_API_TOKEN` — API token из Fienta **Settings → Integration**;
   - `FIENTA_ORGANIZER_ID` — ID организатора;
   - `FIENTA_EVENT_ID` — ID production-события `Undertail`;
   - `FIENTA_WEBHOOK_SECRET` — случайная длинная строка;
   - `FIENTA_TICKET_TYPE_SIDE_MAP` — JSON-сопоставление ID типов билета со сторонами.
5. Не создавайте `LAST_PLAYER_NUMBER`: скрипт сам запишет его после выдачи первого номера.
6. Нажмите **Save**.

`FIENTA_TICKET_TYPE_SIDE_MAP` использует только Ticket Type ID. Пока реальные ID ещё не сняты, не подставляйте примерные числа.

## 3. Внутренние поля Fienta

1. В Fienta откройте production-событие `Undertail` и форму участника каждого билета.
2. После того как пункт 1 исходного плана завершён, получите реальные ключи из API/webhook payload.
3. Если ключи отличаются от значений по умолчанию, добавьте нужные Script Properties:
   - `FIENTA_FIRST_NAME_FIELD`;
   - `FIENTA_LAST_NAME_FIELD`;
   - `FIENTA_EMAIL_FIELD`;
   - `FIENTA_PHONE_FIELD`;
   - `FIENTA_CALLSIGN_FIELD`;
   - `FIENTA_TEAM_FIELD`;
   - `FIENTA_PERMANENT_REGISTRATION_NUMBER_FIELD`.
4. В значение property вставьте точный ключ из payload, затем нажмите **Save**.
5. Проверьте один заказ с несколькими билетами: поля каждого игрока должны попасть в свою строку.

## 4. Первый импорт

1. В Apps Script откройте **Editor**.
2. В списке функций выберите `syncFientaRegistrations`.
3. Нажмите **Run** и выдайте разрешения Spreadsheet и external requests.
4. Откройте `Registrations`: должна быть одна строка на билет, `Player Number` начинается с `2000`.
5. Откройте `Game Registrations` и сверьте те же Ticket ID, но без лишних технических полей.
6. Запустите функцию ещё раз. Число строк и `Player Number` не должны измениться.
7. Измените тестовую оплату, check-in и затем отмените билет. После каждого запуска сверяйте оба листа.
8. Для проверки пересборки выберите `rebuildGameSheet`, нажмите **Run** и убедитесь, что Working sheet восстановлен без запроса Fienta.

## 5. Deployment, webhooks и trigger

1. В Apps Script нажмите **Deploy → Manage deployments → Edit**.
2. Выберите **New version**, нажмите **Deploy** и скопируйте URL, заканчивающийся на `/exec`.
3. В `assets/js/config.js` вставьте этот URL в `apiUrl`.
4. В Fienta откройте **Settings → Integration → Webhooks**.
5. Для order completion, registration-form update и ticket validation задайте URL `<DEPLOYED_EXEC_URL>?secret=<FIENTA_WEBHOOK_SECRET>`.
6. Запустите тест webhook и проверьте **Apps Script → Executions** и оба листа.
7. В Editor выберите `installFientaSyncTrigger` и нажмите **Run**.
8. В левом меню откройте **Triggers** и убедитесь, что создан один почасовой trigger `syncFientaRegistrations`.

## 6. GitHub Actions и Cloudflare

1. Добавьте в GitHub весь проект, включая `.github/workflows/sync-local-content.yml`.
2. Откройте **GitHub → Settings → Actions → General**.
3. В **Workflow permissions** выерите **Read and write permissions** и сохраните.
4. Откройте **Actions → Sync local game content → Run workflow**.
5. Проверьте, что изменились только `index.html`, `local-content.js` и/или `local-registrations.js`, а при повторном запуске без изменений нового commit нет.
6. В Cloudflare откройте **Workers & Pages** и тестовый Pages-проект.
7. Проверьте Git-репозиторий и ветку. Отдельный Fienta token в Cloudflare не нужен.
8. После sync-commit проверьте успешный deployment и обновлённую тестовую страницу.

Ручной резервный запуск из корня проекта:

```powershell
node scripts/sync-content.mjs
node scripts/sync-content.mjs --registrations-only
```

## 7. Настройка новой production-игры

1. В Fienta откройте реальное событие. Event ID возьмите из URL/API-ответа и замените `FIENTA_EVENT_ID`.
2. Получите точные Ticket Type ID всех шести типов из API-ответа или webhook payload.
3. Замените `FIENTA_TICKET_TYPE_SIDE_MAP` на JSON вида `{"<ID A1>":"Side A",...,"<ID B3>":"Side B"}` с реальными ID. Строки `<...>` — только шаблон, их нельзя сохранять как настоящую конфигурацию.
4. Сверьте ключи семи attendee-полей и замените только нужные `FIENTA_*_FIELD` properties.
5. Если для реальной игры нужна другая Google таблица, замените `REGISTRATIONS_SPREADSHEET_ID`; иначе оставьте его без изменений.
6. Откройте webhooks production-события и вставьте тот же deployment URL с тем же secret. Старые webhooks отключите только после теста.
7. `FIENTA_API_TOKEN`, `FIENTA_ORGANIZER_ID`, Apps Script deployment URL, GitHub workflow и Cloudflare-связь остаются без изменений, если организатор, Apps Script и репозиторий те же.
8. До включения trigger вручную запустите `syncFientaRegistrations`, сверьте оба листа и затем `rebuildGameSheet`.
9. Запустите `node scripts/sync-content.mjs --registrations-only`, откройте `local-registrations.js` и убедитесь, что в нём есть только шесть разрешённых полей, включая `Side`.
10. Только после этого запустите `installFientaSyncTrigger` и проведите тест webhook.

## 8. End-to-end проверка

1. Создайте тестовый билет в Fienta.
2. Запустите/дождитесь `syncFientaRegistrations`.
3. Проверьте строку в Technical sheet `Registrations`.
4. Проверьте ту же строку по Ticket ID в Working sheet `Game Registrations`.
5. Откройте Apps Script URL с `?action=registrations&language=ru`: должны присутствовать только Player Number, Permanent Registration Number, First Name, Callsign и публичный Payment Status.
6. Запустите GitHub workflow и проверьте `assets/js/local-registrations.js`.
7. Дождитесь Cloudflare deployment и откройте «Список зарегистрированных».
8. Повторите workflow без изменений: новый commit и deployment появиться не должны.

```text
Fienta
  ↓
Technical Sheet
  ↓
Working Sheet
  ↓
Public filter
  ↓
Local files
  ↓
Game Page
```
