import { api } from './api.js';
import { config } from './config.js';
import { configureFienta } from './fienta.js';
import { messages } from './i18n.js?v=0.2.7';

let language = chooseInitialLanguage();
const remoteCachePrefix = 'game-page-remote-content-';

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
  renderContactEmail();

  document.title = `${config.game.name} — ${translate('eventType')}`;
  buildRulesContents();
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

function readRemoteCache(cacheLanguage) {
  try {
    const cached = localStorage.getItem(`${remoteCachePrefix}${cacheLanguage}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Cached remote content could not be read.', error);
    return null;
  }
}

function writeRemoteCache(cacheLanguage, values) {
  try {
    const current = readRemoteCache(cacheLanguage) || {};
    const updated = {
      ...current,
      ...values,
      cachedAt: Date.now(),
    };

    localStorage.setItem(`${remoteCachePrefix}${cacheLanguage}`, JSON.stringify(updated));
  } catch (error) {
    console.warn('Remote content could not be cached.', error);
  }
}

function renderContent(content) {
  if (content.description) {
    document.querySelector('[data-remote-content="description"]').innerHTML = content.description;
  }

  if (content.rules) {
    document.querySelector('[data-remote-content="rules"]').innerHTML = content.rules;
  }

  buildRulesContents();
}

async function loadRemoteContent() {
  if (!config.apiUrl) {
    return;
  }

  const requestedLanguage = language;
  const cached = readRemoteCache(requestedLanguage);

  if (cached && cached.content) {
    renderContent(cached.content);
  }

  await api.getContent(requestedLanguage)
    .then((content) => {
      writeRemoteCache(requestedLanguage, { content });

      if (language === requestedLanguage) {
        renderContent(content);
      }
    })
    .catch((error) => {
      console.error('Remote description and rules could not be loaded.', error);
    });
}

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => {
    language = button.dataset.language;
    localStorage.setItem('game-language', language);
    renderLanguage();
    loadRemoteContent();
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
  });
});

window.addEventListener('scroll', () => {
  document.querySelector('[data-header]').classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

document.querySelector('[data-year]').textContent = new Date().getFullYear();

renderLanguage();
configureFienta(translate);
loadRemoteContent();
