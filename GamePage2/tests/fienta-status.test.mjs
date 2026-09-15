import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const projectRoot = new URL('../', import.meta.url);
const links = Array.from({ length: 3 }, () => ({
  addEventListener() {},
  setAttribute() {},
}));
const warning = {};
const status = {
  setAttribute(name, value) {
    this[name] = value;
  },
  textContent: '',
};
let source = null;
let embeddedScriptCount = 0;

const document = {
  body: {
    append(element) {
      source = element;
    },
  },
  createElement(tagName) {
    return {
      addEventListener() {},
      after() {
        if (tagName === 'a') {
          embeddedScriptCount += 1;
        }
      },
      setAttribute(name, value) {
        this[name] = value;
      },
    };
  },
  querySelector(selector) {
    if (selector === '[data-fienta-warning]') {
      return warning;
    }

    if (selector === '[data-ticket-status]') {
      return status;
    }

    if (selector === '[data-fienta-status-source]') {
      return source;
    }

    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-fienta-link]' ? links : [];
  },
};

const context = vm.createContext({
  clearTimeout() {},
  config: {
    fienta: {
      eventUrl: 'https://fienta.com/et/undertail',
    },
  },
  document,
  window: {
    setTimeout() {
      return 1;
    },
  },
});

const sourceCode = fs
  .readFileSync(new URL('assets/js/fienta.js', projectRoot), 'utf8')
  .replace("import { config } from './config.js';", '')
  .replaceAll('export ', '');

vm.runInContext(sourceCode, context, {
  filename: 'assets/js/fienta.js',
});

context.translate = (key, values = {}) => (
  key === 'ticketsLeft' ? `${values.count} left` : key
);

vm.runInContext('configureFienta(translate); configureFienta(translate);', context);

assert.equal(embeddedScriptCount, 1);
assert.equal(links.every((link) => link.target === '_blank'), true);
assert.equal(links.every((link) => link.rel === 'noopener noreferrer'), true);
assert.equal(context.window.fientaSettings.link_selector, 'a[data-fienta-status-source]');

const cases = [
  [true, 'available'],
  [23, 'remaining'],
  [0, 'soldOut'],
  [false, 'saleEnded'],
  [null, 'error'],
];

for (const [value, expectedType] of cases) {
  context.availabilityValue = value;
  assert.equal(
    vm.runInContext('normalizeAvailability(availabilityValue).type', context),
    expectedType,
  );
}

vm.runInContext('setAvailability(normalizeAvailability(7))', context);
assert.equal(status.textContent, '7 left');
assert.equal(status['aria-busy'], 'false');

console.log('Fienta availability tests passed.');
