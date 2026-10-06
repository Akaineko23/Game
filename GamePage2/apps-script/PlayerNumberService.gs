function nextPlayerNumber_(sheet) {
  const properties = PropertiesService.getScriptProperties();
  const storedNumber = Number(properties.getProperty('LAST_PLAYER_NUMBER') || '0');
  const sheetNumber = getHighestPlayerNumber_(sheet);
  const current = Math.max(storedNumber, sheetNumber, CONFIG.PLAYER_NUMBER_START - 1);
  const next = current + 1;

  if (next > CONFIG.MAX_PLAYER_NUMBER) {
    throw new Error('PLAYER_NUMBER_LIMIT_REACHED');
  }

  properties.setProperty('LAST_PLAYER_NUMBER', String(next));
  return String(next).padStart(4, '0');
}

function getHighestPlayerNumber_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return 0;
  }

  const headers = ensureSheetHeaders_(sheet, REGISTRATION_HEADERS);
  const playerNumberColumn = getHeaderIndex_(
    headers,
    REGISTRATION_COLUMNS.PLAYER_NUMBER,
  ) + 1;
  const values = sheet
    .getRange(2, playerNumberColumn, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  return values.reduce(function (highest, row) {
    const value = Number(row[0]);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
}
