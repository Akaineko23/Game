function getContent_(language) {
  try {
    return {
      success: true,
      description: getDocumentHtml_(CONFIG.DESCRIPTION_DOCS[language]),
      rules: getDocumentHtml_(CONFIG.RULES_DOCS[language]),
    };
  } catch (error) {
    console.error(error);
    throw new Error('CONTENT_UNAVAILABLE');
  }
}

function getDocumentHtml_(documentId) {
  if (!documentId) {
    return '';
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'document-' + documentId;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const body = DocumentApp.openById(documentId).getBody();
  const html = [];

  for (let index = 0; index < body.getNumChildren(); index += 1) {
    const child = body.getChild(index);
    const type = child.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      html.push(paragraphToHtml_(child.asParagraph()));
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      html.push('<p>• ' + escapeHtml_(child.asListItem().getText()) + '</p>');
    }
  }

  const result = html.join('');
  cache.put(cacheKey, result, CONFIG.CACHE_SECONDS);
  return result;
}

function paragraphToHtml_(paragraph) {
  const text = escapeHtml_(paragraph.getText());

  if (!text) {
    return '';
  }

  const heading = paragraph.getHeading();

  if (heading === DocumentApp.ParagraphHeading.HEADING1) {
    return '<h2>' + text + '</h2>';
  }

  if (heading !== DocumentApp.ParagraphHeading.NORMAL) {
    return '<h3>' + text + '</h3>';
  }

  return '<p>' + text + '</p>';
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
