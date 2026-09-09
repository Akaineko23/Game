function handleFientaWebhook_(event) {
  verifyFientaWebhook_(event);

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
  // Fienta's public help confirms webhook delivery and test tools, but the
  // currently published help page does not specify a signature contract that
  // can be implemented safely in Apps Script without a verified payload.
  // Keep the endpoint closed until the real organiser setup is inspected.
  throw new Error('WEBHOOK_VERIFICATION_NOT_CONFIGURED');
}

function normalizeFientaWebhook_(payload) {
  // Map the exact, observed Fienta test payload here. Do not guess field names.
  // The normalized result must contain one item per attendee/ticket.
  return {
    eventType: '',
    tickets: [],
  };
}
