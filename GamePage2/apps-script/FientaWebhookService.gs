function handleFientaWebhook_(event) {
  verifyFientaWebhook_(event);
  getRegistrationsSpreadsheetId_();

  const payload = JSON.parse(event.postData && event.postData.contents || '{}');
  const webhook = normalizeFientaWebhook_(payload);

  webhook.tickets.forEach(function (ticket) {
    upsertRegistration_(ticket, webhook.eventType);
  });

  return {
    success: true,
    processedTickets: webhook.tickets.length,
  };
}

function verifyFientaWebhook_(event) {
  const configuredSecret = PropertiesService
    .getScriptProperties()
    .getProperty('FIENTA_WEBHOOK_SECRET');
  const receivedSecret = String(event.parameter && event.parameter.secret || '');

  if (!configuredSecret || !receivedSecret) {
    throw new Error('WEBHOOK_VERIFICATION_NOT_CONFIGURED');
  }

  if (!constantTimeEquals_(configuredSecret, receivedSecret)) {
    throw new Error('WEBHOOK_REJECTED');
  }
}

function constantTimeEquals_(expected, actual) {
  const left = String(expected);
  const right = String(actual);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function normalizeFientaWebhook_(payload) {
  if (payload.order && Array.isArray(payload.order.tickets)) {
    return normalizeOrderCompletionWebhook_(payload.order);
  }

  if (payload.ticket && payload.ticket.event && payload.ticket.order) {
    return normalizeTicketWebhook_(payload.ticket);
  }

  throw new Error('WEBHOOK_REJECTED');
}

function normalizeOrderCompletionWebhook_(order) {
  return {
    eventType: 'order-completion',
    tickets: order.tickets.map(function (ticket) {
      return normalizeFientaTicket_(ticket, {
        event: order.event,
        order: order,
        ticketStatus: undefined,
        checkedIn: undefined,
        checkedInAt: undefined,
      });
    }),
  };
}

function normalizeTicketWebhook_(ticket) {
  const isValidation = ticket.status === 'USED' || ticket.validated_at !== undefined;

  return {
    eventType: isValidation ? 'ticket-validation' : 'registration-form',
    tickets: [normalizeFientaTicket_(ticket, {
      event: ticket.event,
      order: ticket.order,
      ticketStatus: isValidation ? ticket.status : undefined,
      checkedIn: isValidation ? ticket.status === 'USED' : undefined,
      checkedInAt: isValidation ? ticket.validated_at : undefined,
      preserveMissingAttendee: true,
    })],
  };
}

function normalizeFientaTicket_(ticket, context) {
  const row = Array.isArray(ticket.rows) && ticket.rows.length ? ticket.rows[0] : {};
  const ticketType = row.ticket_type || {};
  const attendee = row.attendee && typeof row.attendee === 'object' ? row.attendee : {};
  const order = context.order || {};
  const event = context.event || {};
  const missingAttendeeValue = context.preserveMissingAttendee ? undefined : '';

  if (!ticket.code) {
    throw new Error('WEBHOOK_REJECTED');
  }

  return {
    eventId: event.id,
    orderId: order.id,
    ticketId: ticket.code,
    ticketType: ticketType.title,
    side: getFientaSide_(ticketType),
    firstName: getFientaAttendeeField_(attendee, 'FIENTA_FIRST_NAME_FIELD', 'first_name', missingAttendeeValue),
    lastName: getFientaAttendeeField_(attendee, 'FIENTA_LAST_NAME_FIELD', 'last_name', missingAttendeeValue),
    callsign: getFientaAttendeeField_(attendee, 'FIENTA_CALLSIGN_FIELD', 'callsign', missingAttendeeValue),
    email: getFientaAttendeeField_(attendee, 'FIENTA_EMAIL_FIELD', 'email', missingAttendeeValue),
    buyerEmail: order.buyer && order.buyer.email,
    paymentStatus: order.status,
    ticketStatus: context.ticketStatus,
    fientaStatus: context.ticketStatus || order.status,
    checkedIn: context.checkedIn,
    checkedInAt: context.checkedInAt,
  };
}

function getFientaAttendeeField_(attendee, propertyName, defaultName, missingValue) {
  const configuredName = PropertiesService
    .getScriptProperties()
    .getProperty(propertyName);
  const fieldName = configuredName || defaultName;
  return Object.prototype.hasOwnProperty.call(attendee, fieldName)
    ? attendee[fieldName]
    : missingValue;
}

function getFientaSide_(ticketType) {
  const rawMap = PropertiesService
    .getScriptProperties()
    .getProperty('FIENTA_TICKET_TYPE_SIDE_MAP') || '{}';
  let sideMap;

  try {
    sideMap = JSON.parse(rawMap);
  } catch (error) {
    throw new Error('FIENTA_API_NOT_CONFIGURED');
  }

  return sideMap[String(ticketType.id)] || sideMap[String(ticketType.title)] || '';
}
