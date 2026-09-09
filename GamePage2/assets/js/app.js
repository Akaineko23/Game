import { api } from './api.js';
import { config } from './config.js';
import { configureFienta } from './fienta.js';
import { messages } from './i18n.js';

let language = chooseInitialLanguage();

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
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll('[data-language]').forEach((button) => {
    button.classList.toggle('active', button.dataset.language === language);
    button.setAttribute('aria-pressed', button.dataset.language === language);
  });

  document.querySelectorAll('[data-game]').forEach((element) => {
    const value = config.game[element.dataset.game];
    element.textContent = typeof value === 'object' ? value[language] || value.en : value;
  });

  document.title = `${config.game.name} — ${translate('eventType')}`;
  renderEmptySchedule();
  buildRulesContents();
}

function renderEmptySchedule() {
  document.querySelector('[data-schedule]').innerHTML =
    `<p class="empty-state">${translate('scheduleEmpty')}</p>`;
}

function renderSchedule(items) {
  const schedule = document.querySelector('[data-schedule]');

  if (!items.length) {
    renderEmptySchedule();
    return;
  }

  schedule.innerHTML = items
    .map((item) => `
      <article class="schedule-row">
        <div class="schedule-date">${escapeHtml(item.date)}</div>
        <div class="schedule-time">${escapeHtml(item.time)}</div>
        <div class="schedule-title">${escapeHtml(item.title)}</div>
      </article>
    `)
    .join('');
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = String(value || '');
  return element.innerHTML;
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

async function loadRemoteContent() {
  if (!config.apiUrl) {
    return;
  }

  try {
    const [content, schedule] = await Promise.all([
      api.getContent(language),
      api.getSchedule(language),
    ]);

    if (content.description) {
      document.querySelector('[data-remote-content="description"]').innerHTML = content.description;
    }

    if (content.rules) {
      document.querySelector('[data-remote-content="rules"]').innerHTML = content.rules;
    }

    renderSchedule(schedule.items || []);
    buildRulesContents();
  } catch (error) {
    console.error('Remote content could not be loaded.', error);
  }
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
