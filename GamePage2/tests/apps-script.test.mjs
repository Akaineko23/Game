import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const projectRoot = new URL('../', import.meta.url);
const propertyValues = new Map();
const rows = [];
let spreadsheetOpenCount = 0;
let apiCallCount = 0;
let orderStatus = 'COMPLETED';
let ticketStatus = 'UNUSED';
let firstName = 'Alice';

const sheet = {
  appendRow(values) {
    rows.push(values.slice());
  },
  getLastRow() {
    return rows.length;
  },
  getRange(row, column, rowCount = 1, columnCount = 1) {
    return {
      getDisplayValue() {
        return String(rows[row - 1]?.[column - 1] || '');
      },
      getDisplayValues() {
        return Array.from({ length: rowCount }, (_, rowOffset) => (
          Array.from({ length: columnCount }, (_, columnOffset) => (
            String(rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] || '')
          ))
        ));
      },
      getValues() {
        return Array.from({ length: rowCount }, (_, rowOffset) => (
          Array.from({ length: columnCount }, (_, columnOffset) => (
            rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ''
          ))
        ));
      },
      setValues(values) {
        values.forEach((sourceRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          rows[targetRow] ||= [];
          sourceRow.forEach((value, columnOffset) => {
            rows[targetRow][column - 1 + columnOffset] = value;
          });
        });
      },
    };
  },
};

function response(payload, statusCode = 200) {
  return {
    getContentText() {
      return JSON.stringify(payload);
    },
    getResponseCode() {
      return statusCode;
    },
  };
}

function ticket(code, name, status = ticketStatus) {
  return {
    id: code === 'A' ? 101 : 102,
    event_id: 300,
    order_id: 200,
    code,
    status,
    used_at: status === 'USED' ? '2026-10-24 08:05:00' : null,
    order_email: 'buyer@example.com',
    rows: [{
      ticket_type: {
        id: code === 'A' ? 501 : 502,
        title: code === 'A' ? 'Alliance ticket' : 'Village ticket',
      },
      attendee: {
        first_name: name,
        last_name: 'Player',
        callsign: code === 'A' ? '=unsafe' : 'Bravo',
        email: `${code.toLowerCase()}@example.com`,
      },
    }],
  };
}

const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Object,
  String,
  Array,
  encodeURIComponent,
  LockService: {
    getScriptLock() {
      return {
        waitLock() {},
        releaseLock() {},
      };
    },
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(name) {
          return propertyValues.get(name) || null;
        },
        setProperty(name, value) {
          propertyValues.set(name, String(value));
        },
      };
    },
  },
  SpreadsheetApp: {
    openById() {
      spreadsheetOpenCount += 1;
      return {
        getSheetByName() {
          return sheet;
        },
      };
    },
  },
  UrlFetchApp: {
    fetch(url) {
      apiCallCount += 1;

      if (url.includes('/orders')) {
        return response({
          orders: [{
            id: 200,
            status: orderStatus,
            buyer: {
              email: 'buyer@example.com',
            },
            event: {
              id: 300,
            },
            tickets: [
              ticket('A', firstName),
              ticket('B', 'Bob'),
            ],
          }],
          pagination: {
            last_page: 1,
          },
        });
      }

      return response({
        tickets: [
          ticket('A', firstName),
          ticket('B', 'Bob'),
        ],
        pagination: {
          last_page: 1,
        },
      });
    },
  },
  Utilities: {
    sleep() {},
  },
  ScriptApp: {
    getProjectTriggers() {
      return [];
    },
  },
});

for (const file of [
  'apps-script/Config.gs',
  'apps-script/PlayerNumberService.gs',
  'apps-script/RegistrationRepository.gs',
  'apps-script/FientaWebhookService.gs',
  'apps-script/FientaApiService.gs',
]) {
  const source = fs.readFileSync(new URL(file, projectRoot), 'utf8');
  vm.runInContext(source, context, {
    filename: file,
  });
}

assert.throws(
  () => vm.runInContext('syncFientaRegistrations()', context),
  /REGISTRATIONS_SPREADSHEET_NOT_CONFIGURED/,
);
assert.equal(spreadsheetOpenCount, 0);
assert.equal(apiCallCount, 0);

propertyValues.set('REGISTRATIONS_SPREADSHEET_ID', 'test-sheet');
propertyValues.set('FIENTA_API_TOKEN', 'test-token');
propertyValues.set('FIENTA_ORGANIZER_ID', '100');
propertyValues.set('FIENTA_EVENT_ID', '300');
propertyValues.set('FIENTA_WEBHOOK_SECRET', 'test-secret');
propertyValues.set('FIENTA_TICKET_TYPE_SIDE_MAP', JSON.stringify({
  501: 'Alliance',
  502: 'Village',
}));

vm.runInContext('syncFientaRegistrations()', context);
assert.equal(rows.length, 3);
assert.equal(rows[1][1], '0001');
assert.equal(rows[2][1], '0002');
assert.equal(rows[1][4], 'A');
assert.equal(rows[2][4], 'B');
assert.equal(rows[1][6], 'Alliance');
assert.equal(rows[1][9], "'=unsafe");

vm.runInContext('syncFientaRegistrations()', context);
assert.equal(rows.length, 3);
assert.equal(rows[1][1], '0001');
assert.equal(rows[2][1], '0002');

orderStatus = 'REFUNDED';
ticketStatus = 'REFUNDED';
firstName = 'Alicia';
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(rows.length, 3);
assert.equal(rows[1][1], '0001');
assert.equal(rows[1][7], 'Alicia');
assert.equal(rows[1][11], 'REFUNDED');
assert.equal(rows[1][12], 'REFUNDED');

const registrationWebhook = {
  parameter: {
    secret: 'test-secret',
  },
  postData: {
    contents: JSON.stringify({
      ticket: {
        code: 'A',
        rows: [{
          ticket_type: {
            id: 501,
            title: 'Alliance ticket',
          },
          attendee: {
            first_name: 'Alicia',
            last_name: 'Player',
            callsign: 'Alpha',
            email: 'a@example.com',
          },
        }],
        event: {
          id: 300,
        },
        order: {
          id: 200,
          status: 'REFUNDED',
          buyer: {
            email: 'buyer@example.com',
          },
        },
      },
    }),
  },
};
context.registrationWebhook = registrationWebhook;
vm.runInContext('handleFientaWebhook_(registrationWebhook)', context);
assert.equal(rows.length, 3);
assert.equal(rows[1][1], '0001');
assert.equal(rows[1][9], 'Alpha');
assert.equal(rows[1][12], 'REFUNDED');

const validationWebhook = structuredClone(registrationWebhook);
validationWebhook.postData.contents = JSON.stringify({
  ticket: {
    ...JSON.parse(registrationWebhook.postData.contents).ticket,
    rows: [{
      ticket_type: {
        id: 501,
        title: 'Alliance ticket',
      },
    }],
    status: 'USED',
    validated_at: '2026-10-24T08:05:00+03:00',
  },
});
context.validationWebhook = validationWebhook;
vm.runInContext('handleFientaWebhook_(validationWebhook)', context);
assert.equal(rows[1][12], 'USED');
assert.equal(rows[1][14], true);
assert.equal(rows[1][15], '2026-10-24T08:05:00+03:00');
assert.equal(rows[1][7], 'Alicia');
assert.equal(rows[1][9], 'Alpha');

console.log('Apps Script integration tests passed.');
