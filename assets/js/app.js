import { config } from './config.js';
import { configureFienta, renderFientaStatus } from './fienta.js?v=0.2.10';
import { messages } from './i18n.js?v=0.3.1';
import { localContent } from './local-content.js?v=0.3.0';
import { localRegistrations } from './local-registrations.js?v=0.4.0';

let language = chooseInitialLanguage();
let contentMode = getModeForHash(window.location.hash);

function getModeForHash(hash) {
  if (hash === '#registered') {
    return 'registered';
  }

  if (hash === '#map') {
    return 'map';
  }

  if (hash === '#about' || hash === '#rules') {
    return 'details';
  }

  return 'news';
}

function setContentMode(mode) {
  contentMode = mode;

  document.querySelectorAll('[data-content-mode-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.contentModePanel !== contentMode;
  });

  document.querySelectorAll('[data-content-mode]').forEach((button) => {
    const isActive = button.dataset.contentMode === contentMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function setActiveNavigation(hash) {
  document.querySelectorAll('[data-navigation-target]').forEach((link) => {
    const isActive = link.dataset.navigationTarget === hash;
    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('[data-navigation-dropdown]').forEach((dropdown) => {
    const groupedHashes = ['#information', '#about', '#rules'];
    dropdown.classList.toggle('active', groupedHashes.includes(hash));
  });
}

function navigateToSection(hash, mode) {
  setContentMode(mode);
  setActiveNavigation(hash);

  if (window.location.hash !== hash) {
    window.history.pushState(null, '', hash);
  }

  window.requestAnimationFrame(() => {
    document.querySelector(hash)?.scrollIntoView();
  });
}

function chooseInitialLanguage() {
  const saved = localStorage.getItem('game-language');

  if (saved && messages[saved]) {
    return saved;
  }

  const browserLanguage = (navigator.language || '').slice(0, 2).toLowerCase();
  return messages[browserLanguage] ? browserLanguage : 'et';
}

function translate(key, variables = {}) {
  let text = messages[language][key] || messages.en[key] || key;

  Object.entries(variables).forEach(([name, value]) => {
    text = text.replace(`{${name}}`, value);
  });

  return text;
}

function renderLanguage() {
  document.documentElement.lang = language;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;

    if (element.hasAttribute('data-i18n-hide-empty')) {
      const optionalText = messages[language][key] || '';
      element.textContent = optionalText;
      element.hidden = optionalText.length === 0;
      return;
    }

    element.textContent = translate(key);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
  });

  document.querySelectorAll('[data-language]').forEach((button) => {
    button.classList.toggle('active', button.dataset.language === language);
    button.setAttribute('aria-pressed', button.dataset.language === language);
  });

  document.querySelectorAll('[data-game]').forEach((element) => {
    const value = config.game[element.dataset.game];
    element.textContent = typeof value === 'object' ? value[language] || value.en : value;
  });

  document.querySelectorAll('[data-game-time]').forEach((element) => {
    const value = config.game.times[element.dataset.gameTime];
    element.textContent = value || translate('timePending');
  });

  renderTicketWaves();

  document.querySelector('[data-map-link]').href = config.game.mapUrl;
  document.querySelectorAll('[data-map-image], [data-map-dialog-image]').forEach((image) => {
    image.src = config.game.mapImage;
  });
  applySideConfiguration();
  renderContactEmail();
  renderLocalContent();
  renderRegisteredPlayers();
  setContentMode(contentMode);
  setActiveNavigation(window.location.hash || '#news');

  document.title = `${config.game.name} — ${translate('eventType')}`;
  renderFientaStatus(translate);
}

function applySideConfiguration() {
  document.documentElement.style.setProperty('--side-1', config.game.sides.side1.color);
  document.documentElement.style.setProperty('--side-2', config.game.sides.side2.color);
}

function renderFriends() {
  const container = document.querySelector('[data-friends-list]');
  container.replaceChildren();

  config.game.friends.forEach((friend) => {
    const item = document.createElement('article');
    item.className = 'friend-item';
    const imageLink = document.createElement('a');
    imageLink.href = friend.url;
    imageLink.target = '_blank';
    imageLink.rel = 'noopener noreferrer';
    imageLink.setAttribute('aria-label', friend.name);
    const image = document.createElement('img');
    image.src = friend.image;
    image.alt = '';
    image.loading = 'lazy';
    imageLink.append(image);
    const nameLink = document.createElement('a');
    nameLink.href = friend.url;
    nameLink.target = '_blank';
    nameLink.rel = 'noopener noreferrer';
    nameLink.textContent = friend.name;
    item.append(imageLink, nameLink);
    container.append(item);
  });
}

function renderTicketWaves() {
  document.querySelectorAll('[data-ticket-wave]').forEach((element) => {
    const wave = config.game.ticketWaves.find((item) => item.key === element.dataset.ticketWave);

    if (!wave) {
      return;
    }

    element.querySelector('[data-ticket-wave-price]').textContent = wave.price;
    const dates = element.querySelector('[data-ticket-wave-dates]');
    dates.textContent = wave.dates;
    dates.hidden = !wave.dates;
  });
}

function renderContactEmail() {
  const contact = document.querySelector('[data-contact-email]');
  const email = config.game.contactEmail.trim();

  contact.hidden = !email;
  contact.textContent = email;
  contact.href = email ? `mailto:${email}` : '';
}

function buildRulesContents() {
  const contents = document.querySelector('[data-rules-toc]');
  contents.innerHTML = '';

  document.querySelectorAll('.rules-content h2, .rules-content h3').forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `rule-${index + 1}`;
    }

    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    contents.append(link);
  });
}

function renderLocalContent() {
  const content = localContent[language];

  ['description', 'rules'].forEach((contentKey) => {
    const container = document.querySelector(`[data-remote-content="${contentKey}"]`);
    const html = content && content[contentKey];

    if (typeof html === 'string' && html.trim()) {
      container.innerHTML = html;
    } else {
      container.textContent = translate('contentUnavailable');
    }

    container.setAttribute('aria-busy', 'false');
  });

  const newsContainer = document.querySelector('[data-local-content="news"]');
  const newsHtml = content && content.news;

  if (typeof newsHtml === 'string' && newsHtml.trim()) {
    newsContainer.innerHTML = newsHtml;
  } else {
    newsContainer.textContent = translate('newsUnavailable');
  }

  buildRulesContents();
}

function renderRegisteredPlayers() {
  const container = document.querySelector('[data-registered-content]');
  const registrations = localRegistrations[language];

  container.replaceChildren();
  renderSideBalance(registrations);

  if (!registrations || !registrations.columns.length) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = translate('registeredColumnsPending');
    container.append(message);
    return;
  }

  if (!registrations.rows.length) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = translate('registeredEmpty');
    container.append(message);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'registered-table-wrapper';
  const table = document.createElement('table');
  table.className = 'registered-table';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');

  registrations.columns.forEach((column) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.textContent = column.label;
    heading.dataset.columnKey = column.key;
    headRow.append(heading);
  });

  head.append(headRow);
  table.append(head);
  const body = document.createElement('tbody');

  registrations.rows.forEach((registration) => {
    const row = document.createElement('tr');

    registration.forEach((value, index) => {
      const column = registrations.columns[index];
      const cell = document.createElement('td');
      cell.dataset.columnKey = column.key;

      if (column.key === 'Payment Status') {
        const status = document.createElement('span');
        status.className = value === translate('paymentPaid')
          ? 'registration-badge payment-paid'
          : 'registration-badge payment-unpaid';
        status.textContent = value;
        cell.append(status);
      } else if (column.key === 'Side') {
        const side = document.createElement('span');
        side.className = 'registration-badge';

        if (value === config.game.sides.side1.name) {
          side.classList.add('side-1');
        } else if (value === config.game.sides.side2.name) {
          side.classList.add('side-2');
        }

        side.textContent = value;
        cell.append(side);
      } else {
        cell.textContent = value;
      }

      row.append(cell);
    });

    body.append(row);
  });

  table.append(body);
  wrapper.append(table);
  container.append(wrapper);
}

function renderSideBalance(registrations) {
  const balance = document.querySelector('[data-side-balance]');
  const chart = document.querySelector('[data-side-balance-chart]');
  const legend = document.querySelector('[data-side-balance-legend]');

  if (!registrations || !registrations.columns.length) {
    balance.hidden = true;
    return;
  }

  const sideIndex = registrations.columns.findIndex((column) => column.key === 'Side');

  if (sideIndex < 0) {
    balance.hidden = true;
    return;
  }

  const sides = [config.game.sides.side1, config.game.sides.side2];
  const counts = sides.map((side) => registrations.rows.filter((row) => row[sideIndex] === side.name).length);
  const total = counts[0] + counts[1];
  const side1Percent = total ? counts[0] / total * 100 : 50;
  chart.classList.toggle('empty', total === 0);
  chart.style.setProperty('--side-1-percent', `${side1Percent}%`);
  chart.setAttribute('aria-label', `${sides[0].name}: ${counts[0]}; ${sides[1].name}: ${counts[1]}`);
  legend.replaceChildren();

  sides.forEach((side, index) => {
    const row = document.createElement('p');
    const marker = document.createElement('span');
    marker.className = `side-marker side-${index + 1}`;
    marker.setAttribute('aria-hidden', 'true');
    row.append(marker, document.createTextNode(`${side.name} — ${counts[index]}`));
    legend.append(row);
  });

  balance.hidden = false;
}

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => {
    language = button.dataset.language;
    localStorage.setItem('game-language', language);
    renderLanguage();
  });
});

const menu = document.querySelector('[data-navigation]');
const menuToggle = document.querySelector('[data-menu-toggle]');

menuToggle.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('menu-open', isOpen);
});

menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    document.querySelectorAll('[data-navigation-dropdown]').forEach((dropdown) => {
      dropdown.classList.remove('open');
      dropdown.querySelector('[data-navigation-dropdown-toggle]').setAttribute('aria-expanded', 'false');
    });
  });
});

document.querySelectorAll('[data-navigation-dropdown-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const dropdown = button.closest('[data-navigation-dropdown]');
    const isOpen = dropdown.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
});

document.querySelector('[data-news-navigation]').addEventListener('click', (event) => {
  event.preventDefault();

  const isMobileNavigation = window.matchMedia('(max-width: 56.25rem)').matches;

  if (!isMobileNavigation && contentMode === 'news') {
    navigateToSection('#about', 'details');
  } else {
    navigateToSection('#news', 'news');
  }
});

document.querySelector('[data-registered-navigation]').addEventListener('click', (event) => {
  event.preventDefault();
  navigateToSection('#registered', 'registered');
});

document.querySelector('[data-map-navigation]').addEventListener('click', (event) => {
  event.preventDefault();
  navigateToSection('#map', 'map');
});

document.querySelectorAll('[data-content-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.contentMode;
    const hash = mode === 'details' ? '#about' : `#${mode}`;
    navigateToSection(hash, mode);
  });
});

document.querySelectorAll('a[href="#about"], a[href="#rules"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigateToSection(link.hash, 'details');
  });
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash;

  if (hash === '#news') {
    setContentMode('news');
  } else if (hash === '#registered') {
    setContentMode('registered');
  } else if (hash === '#map') {
    setContentMode('map');
  } else if (hash === '#about' || hash === '#rules') {
    setContentMode('details');
  }

  setActiveNavigation(hash);
});

const mapDialog = document.querySelector('[data-map-dialog]');
const mapDialogImage = document.querySelector('[data-map-dialog-image]');
let mapZoom = 1;

function setMapZoom(nextZoom) {
  mapZoom = Math.min(4, Math.max(1, nextZoom));
  mapDialogImage.style.width = `${mapZoom * 100}%`;
}

document.querySelector('[data-map-open]').addEventListener('click', () => {
  setMapZoom(1);
  mapDialog.showModal();
});

document.querySelector('[data-map-close]').addEventListener('click', () => {
  mapDialog.close();
});

document.querySelector('[data-map-zoom-in]').addEventListener('click', () => {
  setMapZoom(mapZoom + 0.5);
});

document.querySelector('[data-map-zoom-out]').addEventListener('click', () => {
  setMapZoom(mapZoom - 0.5);
});

document.querySelector('[data-map-zoom-reset]').addEventListener('click', () => {
  setMapZoom(1);
});

mapDialog.addEventListener('click', (event) => {
  if (event.target === mapDialog) {
    mapDialog.close();
  }
});

window.addEventListener('scroll', () => {
  document.querySelector('[data-header]').classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

document.querySelector('[data-year]').textContent = new Date().getFullYear();

renderFriends();
renderLanguage();
configureFienta(translate);

if (window.location.hash) {
  window.requestAnimationFrame(() => {
    document.querySelector(window.location.hash)?.scrollIntoView();
  });
}
