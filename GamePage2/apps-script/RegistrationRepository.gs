function upsertRegistration_(ticket, eventType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getRegistrationSheet_();
    const headers = ensureSheetHeaders_(sheet, REGISTRATION_HEADERS);
    const existingRow = findRowByHeaderValue_(sheet, headers, REGISTRATION_COLUMNS.TICKET_ID, ticket.ticketId);
    let playerNumber;

    if (existingRow) {
      const existingValues = sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0];
      const existingRecord = rowToRecord_(headers, existingValues);
      playerNumber = String(existingRecord[REGISTRATION_COLUMNS.PLAYER_NUMBER] || '');
      const record = registrationRecord_(ticket, eventType, playerNumber, existingRecord);
      sheet.getRange(existingRow, 1, 1, headers.length).setValues([recordToRow_(headers, record)]);
    } else {
      playerNumber = nextPlayerNumber_(sheet);
      const record = registrationRecord_(ticket, eventType, playerNumber, {});
      sheet.appendRow(recordToRow_(headers, record));
    }

    syncGameRegistration_(ticket.ticketId);
    return playerNumber;
  } finally {
    lock.releaseLock();
  }
}

function getRegistrationsSpreadsheet_() {
  return SpreadsheetApp.openById(getRegistrationsSpreadsheetId_());
}

function getRegistrationSheet_() {
  const sheet = getRegistrationsSpreadsheet_().getSheetByName(CONFIG.REGISTRATION_SHEET_NAME);

  if (!sheet) {
    throw new Error('Missing Registrations sheet');
  }

  return sheet;
}

function getGameRegistrationSheet_() {
  const spreadsheet = getRegistrationsSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(CONFIG.GAME_REGISTRATION_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.GAME_REGISTRATION_SHEET_NAME);
  }

  ensureSheetHeaders_(sheet, GAME_REGISTRATION_HEADERS);
  return sheet;
}

function ensureSheetHeaders_(sheet, requiredHeaders) {
  const existingWidth = Math.max(sheet.getLastColumn(), requiredHeaders.length);
  const existingHeaders = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, existingWidth).getDisplayValues()[0]
    : [];
  const headers = existingHeaders.map(function (header) {
    return String(header);
  });

  while (headers.length && headers[headers.length - 1].trim() === '') {
    headers.pop();
  }

  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
    }
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function getHeaderIndex_(headers, header) {
  const index = headers.indexOf(header);

  if (index < 0) {
    throw new Error('REGISTRATION_COLUMN_MISSING');
  }

  return index;
}

function findRowByHeaderValue_(sheet, headers, header, value) {
  if (value === undefined || value === null || value === '' || sheet.getLastRow() < 2) {
    return 0;
  }

  const column = getHeaderIndex_(headers, header) + 1;
  const values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === String(value)) {
      return index + 2;
    }
  }

  return 0;
}

function findTicketRow_(sheet, ticketId) {
  const headers = ensureSheetHeaders_(sheet, REGISTRATION_HEADERS);
  return findRowByHeaderValue_(sheet, headers, REGISTRATION_COLUMNS.TICKET_ID, ticketId);
}

function registrationRecord_(ticket, eventType, playerNumber, previous) {
  return {
    [REGISTRATION_COLUMNS.LAST_SYNCED_AT]: new Date(),
    [REGISTRATION_COLUMNS.PLAYER_NUMBER]: playerNumber,
    [REGISTRATION_COLUMNS.EVENT_ID]: registrationValue_(ticket.eventId, previous[REGISTRATION_COLUMNS.EVENT_ID]),
    [REGISTRATION_COLUMNS.ORDER_ID]: registrationValue_(ticket.orderId, previous[REGISTRATION_COLUMNS.ORDER_ID]),
    [REGISTRATION_COLUMNS.TICKET_ID]: registrationValue_(ticket.ticketId, previous[REGISTRATION_COLUMNS.TICKET_ID]),
    [REGISTRATION_COLUMNS.TICKET_TYPE_ID]: registrationValue_(ticket.ticketTypeId, previous[REGISTRATION_COLUMNS.TICKET_TYPE_ID]),
    [REGISTRATION_COLUMNS.TICKET_TYPE]: registrationValue_(ticket.ticketType, previous[REGISTRATION_COLUMNS.TICKET_TYPE]),
    [REGISTRATION_COLUMNS.SIDE]: registrationValue_(ticket.side, previous[REGISTRATION_COLUMNS.SIDE]),
    [REGISTRATION_COLUMNS.FIRST_NAME]: registrationValue_(ticket.firstName, previous[REGISTRATION_COLUMNS.FIRST_NAME]),
    [REGISTRATION_COLUMNS.LAST_NAME]: registrationValue_(ticket.lastName, previous[REGISTRATION_COLUMNS.LAST_NAME]),
    [REGISTRATION_COLUMNS.CALLSIGN]: registrationValue_(ticket.callsign, previous[REGISTRATION_COLUMNS.CALLSIGN]),
    [REGISTRATION_COLUMNS.EMAIL]: registrationValue_(ticket.email, previous[REGISTRATION_COLUMNS.EMAIL]),
    [REGISTRATION_COLUMNS.PHONE]: registrationValue_(ticket.phone, previous[REGISTRATION_COLUMNS.PHONE]),
    [REGISTRATION_COLUMNS.TEAM]: registrationValue_(ticket.team, previous[REGISTRATION_COLUMNS.TEAM]),
    [REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER]: registrationValue_(ticket.permanentRegistrationNumber, previous[REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER]),
    [REGISTRATION_COLUMNS.BUYER_EMAIL]: registrationValue_(ticket.buyerEmail, previous[REGISTRATION_COLUMNS.BUYER_EMAIL]),
    [REGISTRATION_COLUMNS.BUYER_PHONE]: registrationValue_(ticket.buyerPhone, previous[REGISTRATION_COLUMNS.BUYER_PHONE]),
    [REGISTRATION_COLUMNS.PAYMENT_STATUS]: registrationValue_(ticket.paymentStatus, previous[REGISTRATION_COLUMNS.PAYMENT_STATUS]),
    [REGISTRATION_COLUMNS.TICKET_STATUS]: registrationValue_(ticket.ticketStatus, previous[REGISTRATION_COLUMNS.TICKET_STATUS]),
    [REGISTRATION_COLUMNS.FIENTA_STATUS]: registrationValue_(ticket.fientaStatus, previous[REGISTRATION_COLUMNS.FIENTA_STATUS]),
    [REGISTRATION_COLUMNS.CHECKED_IN]: ticket.checkedIn === undefined
      ? previous[REGISTRATION_COLUMNS.CHECKED_IN] === true
      : ticket.checkedIn === true,
    [REGISTRATION_COLUMNS.CHECKED_IN_AT]: registrationValue_(ticket.checkedInAt, previous[REGISTRATION_COLUMNS.CHECKED_IN_AT]),
    [REGISTRATION_COLUMNS.RAW_EVENT_TYPE]: registrationValue_(eventType, previous[REGISTRATION_COLUMNS.RAW_EVENT_TYPE]),
  };
}

function rowToRecord_(headers, row) {
  return headers.reduce(function (record, header, index) {
    record[header] = row[index];
    return record;
  }, {});
}

function recordToRow_(headers, record) {
  return headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
  });
}

function syncGameRegistration_(ticketId) {
  const technicalSheet = getRegistrationSheet_();
  const technicalHeaders = ensureSheetHeaders_(technicalSheet, REGISTRATION_HEADERS);
  const technicalRow = findRowByHeaderValue_(technicalSheet, technicalHeaders, REGISTRATION_COLUMNS.TICKET_ID, ticketId);

  if (!technicalRow) {
    deleteGameRegistration_(ticketId);
    return;
  }

  const technicalValues = technicalSheet.getRange(technicalRow, 1, 1, technicalHeaders.length).getValues()[0];
  const technicalRecord = rowToRecord_(technicalHeaders, technicalValues);
  const gameSheet = getGameRegistrationSheet_();
  const gameHeaders = ensureSheetHeaders_(gameSheet, GAME_REGISTRATION_HEADERS);
  const gameRow = findRowByHeaderValue_(gameSheet, gameHeaders, REGISTRATION_COLUMNS.TICKET_ID, ticketId);
  const values = recordToRow_(gameHeaders, technicalRecord);

  if (gameRow) {
    gameSheet.getRange(gameRow, 1, 1, gameHeaders.length).setValues([values]);
  } else {
    gameSheet.appendRow(values);
  }
}

function deleteGameRegistration_(ticketId) {
  const sheet = getGameRegistrationSheet_();
  const headers = ensureSheetHeaders_(sheet, GAME_REGISTRATION_HEADERS);
  const row = findRowByHeaderValue_(sheet, headers, REGISTRATION_COLUMNS.TICKET_ID, ticketId);

  if (row) {
    sheet.deleteRow(row);
  }
}

function rebuildGameSheet() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const technicalSheet = getRegistrationSheet_();
    const technicalHeaders = ensureSheetHeaders_(technicalSheet, REGISTRATION_HEADERS);
    const gameSheet = getGameRegistrationSheet_();
    const gameHeaders = ensureSheetHeaders_(gameSheet, GAME_REGISTRATION_HEADERS);
    const technicalRows = technicalSheet.getLastRow() < 2
      ? []
      : technicalSheet.getRange(2, 1, technicalSheet.getLastRow() - 1, technicalHeaders.length).getValues();

    if (gameSheet.getLastRow() > 1) {
      gameSheet.deleteRows(2, gameSheet.getLastRow() - 1);
    }

    const gameRows = technicalRows.map(function (row) {
      return recordToRow_(gameHeaders, rowToRecord_(technicalHeaders, row));
    });

    if (gameRows.length) {
      gameSheet.getRange(2, 1, gameRows.length, gameHeaders.length).setValues(gameRows);
    }

    return {
      success: true,
      rebuiltRows: gameRows.length,
    };
  } finally {
    lock.releaseLock();
  }
}

function getRegistrationsSpreadsheetId_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('REGISTRATIONS_SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error('REGISTRATIONS_SPREADSHEET_NOT_CONFIGURED');
  }

  return spreadsheetId;
}

function deleteRegistration_(ticketId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getRegistrationSheet_();
    const headers = ensureSheetHeaders_(sheet, REGISTRATION_HEADERS);
    const row = findRowByHeaderValue_(sheet, headers, REGISTRATION_COLUMNS.TICKET_ID, ticketId);

    if (!row) {
      deleteGameRegistration_(ticketId);
      return false;
    }

    sheet.deleteRow(row);
    deleteGameRegistration_(ticketId);
    return true;
  } finally {
    lock.releaseLock();
  }
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
