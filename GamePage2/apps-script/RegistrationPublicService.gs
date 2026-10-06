const PUBLIC_REGISTRATION_HEADERS = [
  REGISTRATION_COLUMNS.PLAYER_NUMBER,
  REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER,
  REGISTRATION_COLUMNS.FIRST_NAME,
  REGISTRATION_COLUMNS.CALLSIGN,
  REGISTRATION_COLUMNS.SIDE,
  REGISTRATION_COLUMNS.PAYMENT_STATUS,
];

const PUBLIC_REGISTRATION_LABELS = {
  et: {
    [REGISTRATION_COLUMNS.PLAYER_NUMBER]: 'Mängija number',
    [REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER]: 'Püsiv number',
    [REGISTRATION_COLUMNS.FIRST_NAME]: 'Eesnimi',
    [REGISTRATION_COLUMNS.CALLSIGN]: 'Hüüdnimi',
    [REGISTRATION_COLUMNS.SIDE]: 'Pool',
    [REGISTRATION_COLUMNS.PAYMENT_STATUS]: 'Makse',
  },
  ru: {
    [REGISTRATION_COLUMNS.PLAYER_NUMBER]: 'Номер игрока',
    [REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER]: 'Постоянный номер',
    [REGISTRATION_COLUMNS.FIRST_NAME]: 'Имя',
    [REGISTRATION_COLUMNS.CALLSIGN]: 'Позывной',
    [REGISTRATION_COLUMNS.SIDE]: 'Сторона',
    [REGISTRATION_COLUMNS.PAYMENT_STATUS]: 'Оплата',
  },
  en: {
    [REGISTRATION_COLUMNS.PLAYER_NUMBER]: 'Player number',
    [REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER]: 'Permanent number',
    [REGISTRATION_COLUMNS.FIRST_NAME]: 'First name',
    [REGISTRATION_COLUMNS.CALLSIGN]: 'Callsign',
    [REGISTRATION_COLUMNS.SIDE]: 'Side',
    [REGISTRATION_COLUMNS.PAYMENT_STATUS]: 'Payment',
  },
};

const PUBLIC_PAYMENT_LABELS = {
  et: {
    paid: 'Makstud',
    unpaid: 'Maksmata',
  },
  ru: {
    paid: 'Оплачен',
    unpaid: 'Не оплачен',
  },
  en: {
    paid: 'Paid',
    unpaid: 'Unpaid',
  },
};

function getPublicRegistrations_(language) {
  const sheet = getGameRegistrationSheet_();
  const headers = ensureSheetHeaders_(sheet, GAME_REGISTRATION_HEADERS);
  const columns = PUBLIC_REGISTRATION_HEADERS.map(function (header) {
    return {
      key: header,
      label: PUBLIC_REGISTRATION_LABELS[language][header],
    };
  });

  if (sheet.getLastRow() < 2) {
    return {
      success: true,
      columns: columns,
      rows: [],
    };
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getDisplayValues();
  const rows = values.map(function (row) {
    const record = rowToRecord_(headers, row);

    return PUBLIC_REGISTRATION_HEADERS.map(function (header) {
      return publicRegistrationValue_(header, record[header], language);
    });
  });

  return {
    success: true,
    columns: columns,
    rows: rows,
  };
}

function publicRegistrationValue_(header, value, language) {
  if (header === REGISTRATION_COLUMNS.PERMANENT_REGISTRATION_NUMBER) {
    return isSafePermanentRegistrationNumber_(value) ? String(value) : '';
  }

  if (header === REGISTRATION_COLUMNS.PAYMENT_STATUS) {
    return publicPaymentStatus_(value, language);
  }

  return String(value || '');
}

function isSafePermanentRegistrationNumber_(value) {
  return /^\d{1,5}$/.test(String(value || ''));
}

function publicPaymentStatus_(value, language) {
  const paidStatuses = ['PAID', 'COMPLETED'];
  const status = String(value || '').toUpperCase();
  const state = paidStatuses.indexOf(status) >= 0 ? 'paid' : 'unpaid';
  return PUBLIC_PAYMENT_LABELS[language][state];
}
