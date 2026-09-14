import { config } from './config.js';

export function configureFienta(translate) {
  const links = document.querySelectorAll('[data-fienta-link]');
  const warning = document.querySelector('[data-fienta-warning]');
  const eventUrl = config.fienta.eventUrl.trim();

  if (!eventUrl) {
    links.forEach((link) => {
      link.setAttribute('aria-disabled', 'true');
      link.addEventListener('click', (event) => event.preventDefault());
    });
    return;
  }

  links.forEach((link) => {
    link.href = eventUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
  warning.hidden = true;

  if (!config.fienta.embedEnabled) {
    return;
  }

  window.fientaSettings = {
    link_selector: 'a.fienta-link',
    onTicketsAvailableReady(element, count) {
      updateAvailability(element, count, translate);
    },
  };

  const script = document.createElement('script');
  script.src = 'https://fienta.com/embed.js';
  script.async = true;
  document.head.append(script);
}

function updateAvailability(element, count, translate) {
  const status = document.querySelector('[data-ticket-status]');
  let message = translate('ticketStatusUnknown');

  if (count === true) {
    message = translate('ticketsAvailable');
  } else if (typeof count === 'number' && count > 0) {
    message = translate('ticketsLeft').replace('{count}', count);
  } else if (count === 0) {
    message = translate('soldOut');
  } else if (count === false) {
    message = translate('saleEnded');
  }

  status.textContent = message;
}
