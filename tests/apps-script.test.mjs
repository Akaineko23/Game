import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const projectRoot = new URL('../', import.meta.url);
const propertyValues = new Map();
const sheets = new Map();
let spreadsheetOpenCount = 0;
let apiCallCount = 0;
let rangeCallCount = 0;
let setValuesCallCount = 0;
let appendRowCallCount = 0;
let propertyReadCount = 0;
let orderStatus = 'COMPLETED';
let includedCodes = ['A'];
let orderFixtures = null;
const ticketStatuses = new Map();
const firstNames = new Map();

function createSheet(name) {
  const rows = [];

  return {
    name,
    rows,
    appendRow(values) {
      appendRowCallCount += 1;
      rows.push(values.slice());
    },
    getLastRow() {
      return rows.length;
    },
    getLastColumn() {
      return rows.reduce((width, row) => Math.max(width, row.length), 0);
    },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      rangeCallCount += 1;

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
          setValuesCallCount += 1;

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

function ticket(code, includeAttendee = true, orderId = 200) {
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
    order_id: orderId,
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
          propertyReadCount += 1;
          return propertyValues.get(name) || null;
        },
        getProperties() {
          propertyReadCount += 1;
          return Object.fromEntries(propertyValues);
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
          orders: orderFixtures || [{
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
        tickets: orderFixtures
          ? orderFixtures.flatMap((order) => order.tickets.map((item) => ({
            ...item,
            order_id: order.id,
            order_email: order.buyer.email,
            order_phone: order.buyer.phone,
            rows: [],
          })))
          : includedCodes.map((code) => ticket(code, false)),
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

// A first import sorts purchases by their real numeric order ID while preserving
// the ticket order supplied inside each purchase.
for (const sheet of sheets.values()) {
  sheet.rows.splice(0);
}
propertyValues.delete('LAST_PLAYER_NUMBER');
ticketStatuses.clear();
firstNames.clear();
orderFixtures = [
  {
    id: 500,
    status: 'COMPLETED',
    buyer: {
      email: 'newer@example.com',
      phone: '+3725550500',
    },
    event: {
      id: 300,
    },
    tickets: ['E', 'F'].map((code) => ticket(code, true, 500)),
  },
  {
    id: 100,
    status: 'COMPLETED',
    buyer: {
      email: 'older@example.com',
      phone: '+3725550100',
    },
    event: {
      id: 300,
    },
    tickets: ['A', 'B', 'C', 'D'].map((code) => ticket(code, true, 100)),
  },
];
rangeCallCount = 0;
setValuesCallCount = 0;
appendRowCallCount = 0;
propertyReadCount = 0;

vm.runInContext('syncFientaRegistrations()', context);

const initialHeaders = sheets.get('Registrations').rows[0];
const initialTicketColumn = initialHeaders.indexOf('Fienta Ticket ID');
const initialPlayerNumberColumn = initialHeaders.indexOf('Player Number');
const initialRows = sheets.get('Registrations').rows.slice(1);

assert.deepEqual(
  initialRows.map((row) => row[initialTicketColumn]),
  ['A', 'B', 'C', 'D', 'E', 'F'],
);
assert.deepEqual(
  initialRows.map((row) => row[initialPlayerNumberColumn]),
  ['2000', '2001', '2002', '2003', '2004', '2005'],
);
assert.equal(appendRowCallCount, 0);
assert.ok(setValuesCallCount <= 4);
assert.ok(rangeCallCount <= 4);
assert.ok(propertyReadCount <= 6);

// A repeated synchronization keeps row order and existing player numbers.
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(sheets.get('Registrations').rows.length, 7);
assert.equal(recordFor('Registrations', 'A')['Player Number'], '2000');
assert.equal(recordFor('Registrations', 'F')['Player Number'], '2005');

// A later order is appended and receives the next unused player number.
orderFixtures.unshift({
  id: 700,
  status: 'COMPLETED',
  buyer: {
    email: 'latest@example.com',
    phone: '+3725550700',
  },
  event: {
    id: 300,
  },
  tickets: [ticket('G', true, 700)],
});
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'G')['Player Number'], '2006');
assert.equal(sheets.get('Registrations').rows.at(-1)[initialTicketColumn], 'G');

// Updates and cancellations still affect both technical and working sheets.
firstNames.set('A', 'Updated oldest player');
ticketStatuses.set('B', 'CANCELED');
orderFixtures[2].tickets = ['A', 'B', 'C', 'D'].map((code) => ticket(code, true, 100));
vm.runInContext('syncFientaRegistrations()', context);
assert.equal(recordFor('Registrations', 'A')['First Name'], 'Updated oldest player');
assert.equal(recordFor('Registrations', 'A')['Player Number'], '2000');
assert.equal(recordFor('Registrations', 'B')['Fienta Ticket ID'], '');
assert.equal(recordFor('Game Registrations', 'B')['Fienta Ticket ID'], '');

// A 63-ticket import still uses batch writes instead of per-ticket sheet writes.
for (const sheet of sheets.values()) {
  sheet.rows.splice(0);
}
propertyValues.delete('LAST_PLAYER_NUMBER');
ticketStatuses.clear();
orderFixtures = Array.from({ length: 21 }, (_, orderIndex) => {
  const orderId = 1000 + orderIndex;
  const codes = Array.from({ length: 3 }, (_, ticketIndex) => (
    `P${String(orderIndex * 3 + ticketIndex + 1).padStart(3, '0')}`
  ));

  return {
    id: orderId,
    status: 'COMPLETED',
    buyer: {
      email: `buyer${orderIndex}@example.com`,
      phone: '+3725550000',
    },
    event: {
      id: 300,
    },
    tickets: codes.map((code) => ticket(code, true, orderId)),
  };
}).reverse();
rangeCallCount = 0;
setValuesCallCount = 0;
appendRowCallCount = 0;
propertyReadCount = 0;

vm.runInContext('syncFientaRegistrations()', context);
assert.equal(sheets.get('Registrations').rows.length, 64);
assert.equal(sheets.get('Game Registrations').rows.length, 64);
assert.equal(appendRowCallCount, 0);
assert.ok(setValuesCallCount <= 4);
assert.ok(rangeCallCount <= 4);
assert.ok(propertyReadCount <= 6);

console.log('Apps Script integration tests passed.');
