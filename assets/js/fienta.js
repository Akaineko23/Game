import { config } from './config.js';

const statusTimeout = 12 * 1000;

let availability = {
  type: 'loading',
};
let statusRequestId = 0;
let translateStatus = null;
let isConfigured = false;

export function configureFienta(translate) {
  if (isConfigured) {
    translateStatus = translate;
    renderFientaStatus(translate);
    return;
  }

  isConfigured = true;

  const links = document.querySelectorAll('[data-fienta-link]');
  const warning = document.querySelector('[data-fienta-warning]');
  const eventUrl = config.fienta.eventUrl.trim();

  translateStatus = translate;

  if (!eventUrl) {
    links.forEach((link) => {
      link.setAttribute('aria-disabled', 'true');
      link.addEventListener('click', (event) => {
        event.preventDefault();
      });
    });

    availability = {
      type: 'error',
    };
    renderFientaStatus(translate);
    return;
  }

  links.forEach((link) => {
    link.href = eventUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
  warning.hidden = true;

  const source = document.querySelector('[data-fienta-status-source]');

  if (source) {
    source.href = eventUrl;
  }

  const requestId = statusRequestId + 1;
  statusRequestId = requestId;
  let requestFinished = false;

  const finishRequest = (count) => {
    if (requestFinished || requestId !== statusRequestId) {
      return;
    }

    requestFinished = true;
    clearTimeout(timeoutId);
    setAvailability(normalizeAvailability(count));
  };

  const timeoutId = window.setTimeout(() => {
    if (requestFinished || requestId !== statusRequestId) {
      return;
    }

    requestFinished = true;
    setAvailability({
      type: 'error',
    });
  }, statusTimeout);

  window.addEventListener('fienta:tickets-available', (event) => {
    finishRequest(event.detail);
  }, {
    once: true,
  });

  if (window.fientaAvailabilityState?.received) {
    finishRequest(window.fientaAvailabilityState.value);
  }
}

export function renderFientaStatus(translate = translateStatus) {
  const status = document.querySelector('[data-ticket-status]');

  if (!status || !translate) {
    return;
  }

  let message = translate('ticketStatusUnavailable');

  if (availability.type === 'loading') {
    message = translate('ticketStatusLoading');
  } else if (availability.type === 'available') {
    message = translate('ticketsAvailable');
  } else if (availability.type === 'remaining') {
    message = translate('ticketsLeft', {
      count: availability.count,
    });
  } else if (availability.type === 'soldOut') {
    message = translate('soldOut');
  } else if (availability.type === 'saleEnded') {
    message = translate('saleEnded');
  }

  status.textContent = message;
  status.setAttribute('aria-busy', String(availability.type === 'loading'));
}

function normalizeAvailability(count) {
  if (count === true) {
    return {
      type: 'available',
    };
  }

  if (typeof count === 'number' && count > 0) {
    return {
      type: 'remaining',
      count,
    };
  }

  if (count === 0) {
    return {
      type: 'soldOut',
    };
  }

  if (count === false) {
    return {
      type: 'saleEnded',
    };
  }

  return {
    type: 'error',
  };
}

function setAvailability(value) {
  availability = value;
  renderFientaStatus();
}
