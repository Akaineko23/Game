function getSchedule_(language) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'schedule-' + language;
    const cached = cache.get(cacheKey);

    if (cached) {
      return { success: true, items: JSON.parse(cached) };
    }

    const sheet = SpreadsheetApp
      .openById(CONFIG.SCHEDULE_SHEET_ID)
      .getSheetByName(CONFIG.SCHEDULE_SHEET_NAME);

    if (!sheet) {
      throw new Error('Missing Schedule sheet');
    }

    const rows = sheet.getDataRange().getDisplayValues();

    if (rows.length < 2) {
      return { success: true, items: [] };
    }

    const headers = rows.shift();
    const column = function (name) {
      return headers.indexOf(name);
    };

    const items = rows
      .filter(function (row) {
        return String(row[column('VISIBLE')]).toLowerCase() !== 'false';
      })
      .map(function (row) {
        return {
          date: row[column('DATE')] || '',
          time: [row[column('START_TIME')], row[column('END_TIME')]].filter(Boolean).join('–'),
          title: row[column('TITLE_' + language.toUpperCase())] || '',
        };
      });

    cache.put(cacheKey, JSON.stringify(items), CONFIG.CACHE_SECONDS);
    return { success: true, items: items };
  } catch (error) {
    console.error(error);
    throw new Error('SCHEDULE_UNAVAILABLE');
  }
}
