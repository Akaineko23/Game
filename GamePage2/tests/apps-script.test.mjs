import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const projectRoot = new URL('../', import.meta.url);
const propertyValues = new Map();
const sheets = new Map();
let spreadsheetOpenCount = 0;
let apiCallCount = 0;
let orderStatus = 'COMPLETED';
let includedCodes = ['A'];
const ticketStatuses = new Map();
const firstNames = new Map();

function createSheet(name) {
  const rows = [];

  return {
    name,
    rows,
    appendRow(values) {
      rows.push(values.slice());
    },
    getLastRow() {
      return rows.length;
    },
    getLastColumn() {
      return rows.reduce((width, row) => Math.max(width, row.length), 0);
    },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return {
        getDisplayValue() {
          return String(rows[row - 1]?.[column - 1] ?? '');
        },
        getDisplayValues() {
          return Array.from({ length: rowCount }, (_, rowOffset) => (
            Array.from({ length: columnCount }, (_, columnOffset) => (
              String(rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '')
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
    deleteRow(row) {
      rows.splice(row - 1, 1);
    },
    deleteRows(row, count) {
      rows.splice(row - 1, count);
    },
  };
}

sheets.set('Registrations', createSheet('Registrations'));

const spreadsheet = {
  getSheetByName(name) {
    return sheets.get(name) || null;
  },
  insertSheet(name) {
    const sheet = createSheet(name);
    sheets.set(name, sheet);
    return sheet;
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

function ticket(code, includeAttendee = true) {
  const index = code.charCodeAt(0) - 65;
  const permanentNumbers = ['123', '01234', '99999', '123456', 'ABC123', '123-45'];
  const attendee = {
    first_name: firstNames.get(code) || `Player${code}`,
    last_name: `Last${code}`,
    callsign: code === 'A' ? '=Alpha' : `Call${code}`,
    email: `${code.toLowerCase()}@example.com`,
    phone: index % 2 ? '' : `55500${index}`,
    team: index % 2 ? '' : `Team ${code}`,
    permanent_registration_number: permanentNumbers[index],
  };

  return {
    id: 101 + index,
    event_id: 300,
    order_id: 200,
    code,
    status: ticketStatuses.get(code) || 'UNUSED',
    used_at: ticketStatuses.get(code) === 'USED' ? '2026-10-24 08:05:00' : null,
    order_email: 'buyer@example.com',
    order_phone: '+3725550000',
    rows: includeAttendee ? [{
      ticket_type: {
        id: 501 + index,
        title: `Ticket ${code}`,
      },
      attendee,
    }] : [],
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
      return spreadsheet;
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
              phone: '+3725550000',
            },
            event: {
              id: 300,
            },
            tickets: includedCodes.map((code) => ticket(code, true)),
          }],
          pagination: {
            last_page: 1,
          },
        });
      }

      return response({
        tickets: includedCodes.map((code) => ticket(code, false)),
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
  'apps-script/RegistrationPublicService.gs',
  'apps-script/FientaWebhookService.gs',
  'apps-script/FientaApiService.gs',
]) {
  const source = fs.readFileSync(new URL(file, projectRoot), 'utf8');
  vm.runInContext(source, context, {
    filename: file,
  });
}

function recordFor(sheetName, ticketId) {
  const rows = sheets.get(sheetName).rows;
  const headers = rows[0];
  const ticketColumn = headers.indexOf('Fienta Ticket ID');
  const row = rows.find((candidate, index) => index > 0 && String(candidate[ticketColumn]) === ticketId);

  return Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? '']));
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
  501: 'Side A',
  502: 'Side A',
  503: 'Side A',
  504: 'Side B',
  505: 'Side B',
  506: 'Side B',
}));

// One-ticket order.
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'A')['Player Number'], '2000');
assert.equal(recordFor('Game Registrations', 'A')['Player Number'], '2000');

// Six ticket types, including both sides and optional empty fields.
includedCodes = ['A', 'B', 'C', 'D', 'E', 'F'];
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(sheets.get('Registrations').rows.length, 7);
assert.equal(sheets.get('Game Registrations').rows.length, 7);
assert.equal(recordFor('Registrations', 'A').Side, 'Side A');
assert.equal(recordFor('Registrations', 'D').Side, 'Side B');
assert.equal(recordFor('Registrations', 'B').Phone, '');
assert.equal(recordFor('Registrations', 'A')['Buyer Phone'], "'+3725550000");
assert.equal(recordFor('Registrations', 'A')['First Name'], 'PlayerA');

// A repeated sync and a later payment/data update preserve player numbers.
const playerNumberA = recordFor('Registrations', 'A')['Player Number'];
firstNames.set('A', 'Alicia');
orderStatus = 'PENDING';
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(sheets.get('Registrations').rows.length, 7);
assert.equal(recordFor('Registrations', 'A')['Player Number'], playerNumberA);
assert.equal(recordFor('Registrations', 'A')['First Name'], 'Alicia');
assert.equal(recordFor('Registrations', 'A')['Payment Status'], 'PENDING');

orderStatus = 'COMPLETED';
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'A')['Payment Status'], 'COMPLETED');

// Reordering both sheets must not affect updates.
for (const sheetName of ['Registrations', 'Game Registrations']) {
  sheets.get(sheetName).rows.forEach((row) => row.reverse());
}
firstNames.set('A', 'Alice reordered');
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'A')['First Name'], 'Alice reordered');
assert.equal(recordFor('Registrations', 'A')['Player Number'], playerNumberA);

// Validation webhook keeps attendee values that are absent from the payload.
const validationWebhook = {
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
            title: 'Ticket A',
          },
        }],
        status: 'USED',
        validated_at: '2026-10-24T08:05:00+03:00',
        event: {
          id: 300,
        },
        order: {
          id: 200,
          status: 'COMPLETED',
          buyer: {
            email: 'buyer@example.com',
            phone: '+3725550000',
          },
        },
      },
    }),
  },
};
context.validationWebhook = validationWebhook;
vm.runInContext('handleFientaWebhook_(validationWebhook)', context);
assert.equal(recordFor('Registrations', 'A')['Checked In'], true);
assert.equal(recordFor('Registrations', 'A')['Checked In At'], '2026-10-24T08:05:00+03:00');
assert.equal(recordFor('Registrations', 'A')['First Name'], 'Alice reordered');

// Public output has exactly five approved fields and filters unsafe permanent numbers.
const publicResult = vm.runInContext("getPublicRegistrations_('en')", context);
assert.deepEqual(
  Array.from(publicResult.columns, (column) => column.key),
  ['Player Number', 'Permanent Registration Number', 'First Name', 'Callsign', 'Side', 'Payment Status'],
);
assert.deepEqual(Array.from(publicResult.rows[0]), [playerNumberA, '123', 'Alice reordered', "'=Alpha", 'Side A', 'Paid']);
assert.equal(publicResult.rows[1][1], '01234');
assert.equal(publicResult.rows[3][1], '');
assert.equal(publicResult.rows[4][1], '');
assert.equal(publicResult.rows[5][1], '');
assert.equal(JSON.stringify(publicResult).includes('buyer@example.com'), false);
assert.equal(JSON.stringify(publicResult).includes('Last Name'), false);

// Cancellation removes both rows; a later ticket never reuses the number.
ticketStatuses.set('A', 'REFUNDED');
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'A')['Fienta Ticket ID'], '');
assert.equal(recordFor('Game Registrations', 'A')['Fienta Ticket ID'], '');

ticketStatuses.delete('A');
vm.runInContext('syncFientaRegistrations()', context);
assert.notEqual(recordFor('Registrations', 'A')['Player Number'], playerNumberA);

// The working sheet can be rebuilt without another Fienta request.
const apiCallsBeforeRebuild = apiCallCount;
sheets.get('Game Registrations').rows.splice(1);
const rebuildResult = vm.runInContext('rebuildGameSheet()', context);
assert.equal(rebuildResult.rebuiltRows, 6);
assert.equal(sheets.get('Game Registrations').rows.length, 7);
assert.equal(apiCallCount, apiCallsBeforeRebuild);

console.log('Apps Script integration tests passed.');
