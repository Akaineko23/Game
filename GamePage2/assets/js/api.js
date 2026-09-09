import { config } from './config.js';

async function get(action, language) {
  if (!config.apiUrl) {
    throw new Error('API_NOT_CONFIGURED');
  }

  const url = new URL(config.apiUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('language', language);

  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.code || `HTTP_${response.status}`);
  }

  return result;
}

export const api = {
  getContent(language) {
    return get('content', language);
  },

  getSchedule(language) {
    return get('schedule', language);
  },

  health() {
    return get('health', 'en');
  },
};
