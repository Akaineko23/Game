const FIENTA_API_BASE_URL = 'https://fienta.com/api/v1';
const FIENTA_PAGE_SIZE = 1000;
const FIENTA_MAX_PAGES = 100;
const FIENTA_MAX_ATTEMPTS = 3;

function syncFientaRegistrations() {
  getRegistrationSheet_();

  const settings = getFientaApiSettings_();
  const orderPath = '/organizers/' + encodeURIComponent(settings.organizerId) + '/orders';
  const ticketPath = '/events/' + encodeURIComponent(settings.eventId) + '/tickets';
  const orders = fetchFientaCollection_(orderPath, 'orders', {
    event_id: settings.eventId,
  }, settings.apiToken);
  const apiTickets = fetchFientaCollection_(ticketPath, 'tickets', {}, settings.apiToken);
  const registrations = {};

  orders.forEach(function (order) {
    (order.tickets || []).forEach(function (ticket) {
      const normalized = normalizeFientaTicket_(ticket, {
        event: order.event || {
          id: settings.eventId,
        },
        order: order,
        ticketStatus: undefined,
        checkedIn: undefined,
        checkedInAt: undefined,
      });

      registrations[normalized.ticketId] = normalized;
    });
  });

  apiTickets.forEach(function (ticket) {
    if (!ticket.code) {
      return;
    }

    const normalized = normalizeFientaTicket_(ticket, {
      event: {
        id: ticket.event_id || settings.eventId,
      },
      order: {
        id: ticket.order_id,
        buyer: {
          email: ticket.order_email,
        },
      },
      ticketStatus: ticket.status,
      checkedIn: ticket.status === 'USED',
      checkedInAt: ticket.used_at,
    });
    const existing = registrations[normalized.ticketId] || {};

    registrations[normalized.ticketId] = mergeDefinedValues_(existing, normalized);
  });

  const ticketIds = Object.keys(registrations);

  ticketIds.forEach(function (ticketId) {
    upsertRegistration_(registrations[ticketId], 'api-sync');
  });

  PropertiesService
    .getScriptProperties()
    .setProperty('FIENTA_LAST_SYNC_AT', new Date().toISOString());

  return {
    success: true,
    processedTickets: ticketIds.length,
  };
}

function installFientaSyncTrigger() {
  getFientaApiSettings_();
  getRegistrationsSpreadsheetId_();

  const handlerName = 'syncFientaRegistrations';
  const exists = ScriptApp
    .getProjectTriggers()
    .some(function (trigger) {
      return trigger.getHandlerFunction() === handlerName;
    });

  if (!exists) {
    ScriptApp
      .newTrigger(handlerName)
      .timeBased()
      .everyHours(1)
      .create();
  }

  return {
    success: true,
    created: !exists,
  };
}

function getFientaApiSettings_() {
  const properties = PropertiesService.getScriptProperties();
  const settings = {
    apiToken: properties.getProperty('FIENTA_API_TOKEN'),
    organizerId: properties.getProperty('FIENTA_ORGANIZER_ID'),
    eventId: properties.getProperty('FIENTA_EVENT_ID'),
  };

  if (!settings.apiToken || !settings.organizerId || !settings.eventId) {
    throw new Error('FIENTA_API_NOT_CONFIGURED');
  }

  return settings;
}

function fetchFientaCollection_(path, collectionName, parameters, apiToken) {
  const items = [];
  let page = 1;
  let lastPage = 1;

  do {
    const query = Object.assign({}, parameters, {
      page: page,
      per_page: FIENTA_PAGE_SIZE,
    });
    const payload = fetchFientaJson_(path, query, apiToken);
    const pageItems = Array.isArray(payload[collectionName]) ? payload[collectionName] : [];

    Array.prototype.push.apply(items, pageItems);
    lastPage = payload.pagination && Number(payload.pagination.last_page) || 1;
    page += 1;
  } while (page <= lastPage && page <= FIENTA_MAX_PAGES);

  if (lastPage >= FIENTA_MAX_PAGES && page <= lastPage) {
    throw new Error('FIENTA_API_PAGE_LIMIT_REACHED');
  }

  return items;
}

function fetchFientaJson_(path, parameters, apiToken) {
  const query = Object.keys(parameters)
    .map(function (name) {
      return encodeURIComponent(name) + '=' + encodeURIComponent(parameters[name]);
    })
    .join('&');
  const url = FIENTA_API_BASE_URL + path + (query ? '?' + query : '');

  for (let attempt = 1; attempt <= FIENTA_MAX_ATTEMPTS; attempt += 1) {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + apiToken,
        Accept: 'application/json',
      },
      muteHttpExceptions: true,
    });
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    let payload = {};

    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      payload = {};
    }

    if (statusCode >= 200 && statusCode < 300) {
      return payload;
    }

    const retryable = statusCode === 429 || statusCode >= 500;

    if (!retryable || attempt === FIENTA_MAX_ATTEMPTS) {
      throw new Error('FIENTA_API_REQUEST_FAILED');
    }

    const retryAfterSeconds = Math.min(Number(payload.retry_after) || attempt, 5);
    Utilities.sleep(retryAfterSeconds * 1000);
  }

  throw new Error('FIENTA_API_REQUEST_FAILED');
}

function mergeDefinedValues_(base, update) {
  const result = Object.assign({}, base);

  Object.keys(update).forEach(function (key) {
    if (update[key] !== undefined) {
      result[key] = update[key];
    }
  });

  return result;
}
