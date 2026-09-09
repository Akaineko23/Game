function nextPlayerNumber_() {
  const properties = PropertiesService.getScriptProperties();
  const current = Number(properties.getProperty('LAST_PLAYER_NUMBER') || '0');
  const next = current + 1;

  if (next > CONFIG.MAX_PLAYER_NUMBER) {
    throw new Error('PLAYER_NUMBER_LIMIT_REACHED');
  }

  properties.setProperty('LAST_PLAYER_NUMBER', String(next));
  return String(next).padStart(4, '0');
}
