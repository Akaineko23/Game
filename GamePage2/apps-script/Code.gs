function doGet(event) {
  try {
    const action = String(event.parameter.action || '');

    if (action === 'health') {
      return jsonResponse_({
        success: true,
        service: 'game-page-api',
        version: CONFIG.VERSION,
      });
    }

    const language = validateLanguage_(event.parameter.language);

    if (action === 'content') {
      return jsonResponse_(getContent_(language));
    }

    if (action === 'news') {
      return jsonResponse_(getNews_(language));
    }

    if (action === 'schedule') {
      return jsonResponse_(getSchedule_(language));
    }

    return jsonResponse_({ success: false, code: 'NOT_FOUND' });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ success: false, code: publicErrorCode_(error) });
  }
}

function doPost(event) {
  try {
    return jsonResponse_(handleFientaWebhook_(event));
  } catch (error) {
    console.error(error);
    return jsonResponse_({ success: false, code: publicErrorCode_(error) });
  }
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function validateLanguage_(language) {
  if (CONFIG.LANGUAGES.indexOf(language) === -1) {
    throw new Error('INVALID_LANGUAGE');
  }

  return language;
}

function publicErrorCode_(error) {
  const allowedCodes = [
    'INVALID_LANGUAGE',
    'CONTENT_UNAVAILABLE',
    'SCHEDULE_UNAVAILABLE',
    'WEBHOOK_VERIFICATION_NOT_CONFIGURED',
    'WEBHOOK_REJECTED',
    'PLAYER_NUMBER_LIMIT_REACHED',
    'REGISTRATIONS_SPREADSHEET_NOT_CONFIGURED',
    'FIENTA_API_NOT_CONFIGURED',
  ];

  return allowedCodes.indexOf(error.message) >= 0 ? error.message : 'SERVER_ERROR';
}
