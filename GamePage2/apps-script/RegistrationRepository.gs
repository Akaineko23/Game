const REGISTRATION_HEADERS = [
  'Received At',
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
];

function upsertRegistration_(ticket, eventType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getRegistrationSheet_();
    ensureRegistrationHeaders_(sheet);
    const existingRow = findTicketRow_(sheet, ticket.ticketId);

    if (existingRow) {
      const existingPlayerNumber = sheet.getRange(existingRow, 2).getDisplayValue();
      sheet.getRange(existingRow, 1, 1, REGISTRATION_HEADERS.length).setValues([
        registrationRow_(ticket, eventType, existingPlayerNumber),
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
  const sheet = SpreadsheetApp
    .openById(CONFIG.REGISTRATION_SHEET_ID)
    .getSheetByName(CONFIG.REGISTRATION_SHEET_NAME);

  if (!sheet) {
    throw new Error('Missing Registrations sheet');
  }

  return sheet;
}

function ensureRegistrationHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REGISTRATION_HEADERS);
  }
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

function registrationRow_(ticket, eventType, playerNumber) {
  return [
    new Date(),
    playerNumber,
    ticket.eventId || '',
    ticket.orderId || '',
    ticket.ticketId || '',
    ticket.ticketType || '',
    ticket.side || '',
    ticket.firstName || '',
    ticket.lastName || '',
    ticket.callsign || '',
    ticket.email || '',
    ticket.paymentStatus || '',
    ticket.ticketStatus || '',
    ticket.fientaStatus || '',
    ticket.checkedIn === true,
    ticket.checkedInAt || '',
    eventType || '',
  ];
}
