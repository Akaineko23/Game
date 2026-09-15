const REGISTRATION_HEADERS = [
  'Last Synced At',
  'Player Number',
  'Fienta Event ID',
  'Fienta Order ID',
  'Fienta Ticket ID',
  'Ticket Type',
  'Side',
  'First Name',
  'Last Name',
  'Callsign',
  'Email',
  'Payment Status',
  'Ticket Status',
  'Fienta Status',
  'Checked In',
  'Checked In At',
  'Raw Event Type',
  'Buyer Email',
];

function upsertRegistration_(ticket, eventType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getRegistrationSheet_();
    ensureRegistrationHeaders_(sheet);
    const existingRow = findTicketRow_(sheet, ticket.ticketId);

    if (existingRow) {
      const existingValues = sheet
        .getRange(existingRow, 1, 1, REGISTRATION_HEADERS.length)
        .getValues()[0];
      const existingPlayerNumber = String(existingValues[1] || '');
      sheet.getRange(existingRow, 1, 1, REGISTRATION_HEADERS.length).setValues([
        registrationRow_(ticket, eventType, existingPlayerNumber, existingValues),
      ]);
      return existingPlayerNumber;
    }

    const playerNumber = nextPlayerNumber_();
    sheet.appendRow(registrationRow_(ticket, eventType, playerNumber));
    return playerNumber;
  } finally {
    lock.releaseLock();
  }
}

function getRegistrationSheet_() {
  const spreadsheetId = getRegistrationsSpreadsheetId_();
  const sheet = SpreadsheetApp
    .openById(spreadsheetId)
    .getSheetByName(CONFIG.REGISTRATION_SHEET_NAME);

  if (!sheet) {
    throw new Error('Missing Registrations sheet');
  }

  return sheet;
}

function ensureRegistrationHeaders_(sheet) {
  sheet
    .getRange(1, 1, 1, REGISTRATION_HEADERS.length)
    .setValues([REGISTRATION_HEADERS]);
}

function findTicketRow_(sheet, ticketId) {
  if (!ticketId || sheet.getLastRow() < 2) {
    return 0;
  }

  const ticketIds = sheet
    .getRange(2, 5, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (let index = 0; index < ticketIds.length; index += 1) {
    if (String(ticketIds[index][0]) === String(ticketId)) {
      return index + 2;
    }
  }

  return 0;
}

function registrationRow_(ticket, eventType, playerNumber, existingValues) {
  const previous = existingValues || [];

  return [
    new Date(),
    playerNumber,
    registrationValue_(ticket.eventId, previous[2]),
    registrationValue_(ticket.orderId, previous[3]),
    registrationValue_(ticket.ticketId, previous[4]),
    registrationValue_(ticket.ticketType, previous[5]),
    registrationValue_(ticket.side, previous[6]),
    registrationValue_(ticket.firstName, previous[7]),
    registrationValue_(ticket.lastName, previous[8]),
    registrationValue_(ticket.callsign, previous[9]),
    registrationValue_(ticket.email, previous[10]),
    registrationValue_(ticket.paymentStatus, previous[11]),
    registrationValue_(ticket.ticketStatus, previous[12]),
    registrationValue_(ticket.fientaStatus, previous[13]),
    ticket.checkedIn === undefined ? previous[14] === true : ticket.checkedIn === true,
    registrationValue_(ticket.checkedInAt, previous[15]),
    registrationValue_(eventType, previous[16]),
    registrationValue_(ticket.buyerEmail, previous[17]),
  ];
}

function getRegistrationsSpreadsheetId_() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty('REGISTRATIONS_SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error('REGISTRATIONS_SPREADSHEET_NOT_CONFIGURED');
  }

  return spreadsheetId;
}

function registrationValue_(value, previousValue) {
  if (value === undefined) {
    return previousValue === undefined ? '' : previousValue;
  }

  if (value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    return value;
  }

  return /^[=+\-@]/.test(value) ? "'" + value : value;
}
