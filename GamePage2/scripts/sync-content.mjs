import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const languages = ['et', 'ru', 'en'];
const allowedTags = new Set([
  'a',
  'br',
  'em',
  'h2',
  'h3',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
]);

async function main() {
  const configSource = await fs.readFile(path.join(projectDirectory, 'assets/js/config.js'), 'utf8');
  const apiUrl = process.env.GAME_CONTENT_API_URL || readApiUrl(configSource);
  const newsOnly = process.argv.includes('--news-only');
  const content = {};

  for (const language of languages) {
    if (newsOnly) {
      content[language] = {
        news: await fetchNews(apiUrl, language),
      };
    } else {
      content[language] = await fetchLanguage(apiUrl, language);
    }
  }

  const localContentPath = path.join(projectDirectory, 'assets/js/local-content.js');
  const currentModule = await fs.readFile(localContentPath, 'utf8');
  const generatedModule = newsOnly
    ? updateNewsModule(currentModule, content)
    : createContentModule(content);
  const indexPath = path.join(projectDirectory, 'index.html');
  const currentIndex = await fs.readFile(indexPath, 'utf8');
  const updatedIndex = newsOnly
    ? updateInitialNewsHtml(currentIndex, content.et.news)
    : updateInitialHtml(currentIndex, content.et);

  await writeValidatedFiles([
    {
      targetPath: localContentPath,
      contents: generatedModule,
    },
    {
      targetPath: indexPath,
      contents: updatedIndex,
    },
  ]);

  if (newsOnly) {
    console.log('Local ET/RU/EN news were updated successfully. Description and rules were unchanged.');
  } else {
    console.log('Local ET/RU/EN description, rules and news were updated successfully.');
  }
}

function readApiUrl(configSource) {
  const match = configSource.match(/apiUrl:\s*['"]([^'"]+)['"]/);

  if (!match || !match[1]) {
    throw new Error('The Apps Script apiUrl is missing from assets/js/config.js.');
  }

  return match[1];
}

async function fetchLanguage(apiUrl, language) {
  const [contentPayload, newsPayload] = await Promise.all([
    fetchAction(apiUrl, 'content', language),
    fetchAction(apiUrl, 'news', language),
  ]);

  const description = sanitizeHtml(contentPayload.description);
  const rules = sanitizeHtml(contentPayload.rules);
  const news = sanitizeHtml(newsPayload.news);

  validateContent(language, description, rules, news);

  return {
    description,
    rules,
    news,
  };
}

async function fetchNews(apiUrl, language) {
  const payload = await fetchAction(apiUrl, 'news', language);
  const news = sanitizeHtml(payload.news);

  if (!news.trim()) {
    throw new Error(`News for ${language} is empty; existing local files were not changed.`);
  }

  return news;
}

async function fetchAction(apiUrl, action, language) {
  const url = new URL(apiUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('language', language);
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.code || 'an error');
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `${action} request for ${language} failed after 3 attempts: ${lastError.message}.`,
  );
}

function sanitizeHtml(value) {
  const withoutUnsafeBlocks = String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1\s*>/gi, '');

  return withoutUnsafeBlocks.replace(/<[^>]*>/g, (sourceTag) => {
    const match = sourceTag.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);

    if (!match) {
      return '';
    }

    const closing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const attributes = match[3];

    if (!allowedTags.has(tagName)) {
      return '';
    }

    if (closing) {
      return tagName === 'br' ? '' : `</${tagName}>`;
    }

    if (tagName === 'br') {
      return '<br>';
    }

    if (tagName !== 'a') {
      return `<${tagName}>`;
    }

    const hrefMatch = attributes.match(/\bhref\s*=\s*(['"])(.*?)\1/i);

    if (!hrefMatch || !isSafeLink(hrefMatch[2])) {
      return '<a>';
    }

    const href = escapeAttribute(hrefMatch[2]);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
  });
}

function isSafeLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:';
  } catch (error) {
    return false;
  }
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function validateContent(language, description, rules, news) {
  if (!description.trim() || !rules.trim() || !news.trim()) {
    throw new Error(`Content for ${language} is empty; existing local files were not changed.`);
  }

  if (!/<h[23]>/.test(description) || !/<h[23]>/.test(rules)) {
    throw new Error(`Content for ${language} has no headings; existing local files were not changed.`);
  }
}

function createContentModule(content) {
  const lines = [
    '// Generated by scripts/sync-content.mjs. Do not edit manually.',
    '',
    'export const localContent = {',
  ];

  languages.forEach((language, languageIndex) => {
    lines.push(`  "${language}": {`);

    ['description', 'rules', 'news'].forEach((key, keyIndex, keys) => {
      const suffix = keyIndex === keys.length - 1 ? '' : ',';
      lines.push(`    "${key}": \``);
      lines.push(formatTemplateHtml(content[language][key]));
      lines.push(`    \`${suffix}`);
    });

    const suffix = languageIndex === languages.length - 1 ? '' : ',';
    lines.push(`  }${suffix}`);
  });

  lines.push('};', '');
  return lines.join('\n');
}

function updateNewsModule(source, content) {
  let result = source;

  languages.forEach((language, languageIndex) => {
    const languageStart = result.indexOf(`  "${language}": {`);
    const nextLanguage = languages[languageIndex + 1];
    const languageEnd = nextLanguage
      ? result.indexOf(`  "${nextLanguage}": {`, languageStart)
      : result.lastIndexOf('\n};');

    if (languageStart < 0 || languageEnd < 0) {
      throw new Error(`Missing ${language} block in assets/js/local-content.js.`);
    }

    const languageBlock = result.slice(languageStart, languageEnd);
    const newsStart = languageBlock.indexOf('    "news": `');
    const newsEnd = languageBlock.lastIndexOf('\n    `');

    if (newsStart < 0 || newsEnd <= newsStart) {
      throw new Error(`Missing ${language} news block in assets/js/local-content.js.`);
    }

    const valueStart = languageStart + newsStart + '    "news": `'.length;
    const valueEnd = languageStart + newsEnd;
    const formattedNews = `\n${formatTemplateHtml(content[language].news)}`;
    result = `${result.slice(0, valueStart)}${formattedNews}${result.slice(valueEnd)}`;
  });

  return result;
}

function formatTemplateHtml(html) {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => `      ${escapeTemplateText(line)}`)
    .join('\n');
}

function escapeTemplateText(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function updateInitialHtml(indexSource, estonianContent) {
  let result = replaceMarkedBlock(
    indexSource,
    'LOCAL_DESCRIPTION_ET',
    formatInitialHtml(estonianContent.description),
  );

  result = replaceMarkedBlock(
    result,
    'LOCAL_RULES_ET',
    formatInitialHtml(estonianContent.rules),
  );

  result = replaceMarkedBlock(
    result,
    'LOCAL_NEWS_ET',
    formatInitialHtml(estonianContent.news),
  );

  return result;
}

function updateInitialNewsHtml(indexSource, news) {
  return replaceMarkedBlock(
    indexSource,
    'LOCAL_NEWS_ET',
    formatInitialHtml(news),
  );
}

function replaceMarkedBlock(source, marker, replacement) {
  const pattern = new RegExp(
    `(<!-- ${marker}_START -->)[\\s\\S]*?(<!-- ${marker}_END -->)`,
  );

  if (!pattern.test(source)) {
    throw new Error(`Missing ${marker} markers in index.html.`);
  }

  return source.replace(pattern, `$1\n${replacement}\n            $2`);
}

function formatInitialHtml(html) {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => `            ${line}`)
    .join('\n');
}

async function writeValidatedFiles(files) {
  files.forEach(({ targetPath, contents }) => {
    if (!contents.trim()) {
      throw new Error(`Refusing to overwrite ${targetPath} with empty content.`);
    }
  });

  await Promise.all(files.map(({ targetPath, contents }) => (
    fs.writeFile(`${targetPath}.tmp`, contents, 'utf8')
  )));

  for (const { targetPath } of files) {
    await fs.rename(`${targetPath}.tmp`, targetPath);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
