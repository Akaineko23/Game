import { config } from './config.js';
import { configureFienta, renderFientaStatus } from './fienta.js?v=0.2.10';
import { messages } from './i18n.js?v=0.2.11';
import { localContent } from './local-content.js?v=0.2.11';

let language = chooseInitialLanguage();
let contentMode = getModeForHash(window.location.hash);

function getModeForHash(hash) {
  return hash === '#news' ? 'news' : 'details';
}

function setContentMode(mode) {
  contentMode = mode;

  document.querySelectorAll('[data-content-mode-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.contentModePanel !== contentMode;
  });

  const newsNavigation = document.querySelector('[data-news-navigation]');
  const newsIsActive = contentMode === 'news';
  newsNavigation.classList.toggle('active', newsIsActive);

  if (newsIsActive) {
    newsNavigation.setAttribute('aria-current', 'page');
  } else {
    newsNavigation.removeAttribute('aria-current');
  }
}

function navigateToSection(hash, mode) {
  setContentMode(mode);

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
  renderLocalContent();
  setContentMode(contentMode);

  document.title = `${config.game.name} — ${translate('eventType')}`;
  renderFientaStatus(translate);
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
  });
});

document.querySelector('[data-news-navigation]').addEventListener('click', (event) => {
  event.preventDefault();

  if (contentMode === 'news') {
    navigateToSection('#about', 'details');
  } else {
    navigateToSection('#news', 'news');
  }
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
  } else if (hash === '#about' || hash === '#rules') {
    setContentMode('details');
  }
});

window.addEventListener('scroll', () => {
  document.querySelector('[data-header]').classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

document.querySelector('[data-year]').textContent = new Date().getFullYear();

renderLanguage();
configureFienta(translate);

if (window.location.hash) {
  window.requestAnimationFrame(() => {
    document.querySelector(window.location.hash)?.scrollIntoView();
  });
}
