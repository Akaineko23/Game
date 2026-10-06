import { config } from './config.js';

const requestTimeout = 12 * 1000;

async function get(action, language) {
  if (!config.apiUrl) {
    throw new Error('API_NOT_CONFIGURED');
  }

  const url = new URL(config.apiUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('language', language);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, requestTimeout);
  let response;
  let result;

  try {
    response = await fetch(url, {
      signal: controller.signal,
    });
    result = await response.json();
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok || !result.success) {
    throw new Error(result.code || `HTTP_${response.status}`);
  }

  return result;
}

export const api = {
  getContent(language) {
    return get('content', language);
  },

  health() {
    return get('health', 'en');
  },
};
