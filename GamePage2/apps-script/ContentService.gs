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

function getNews_(language) {
  try {
    return {
      success: true,
      news: getDocumentHtml_(CONFIG.NEWS_DOCS[language]),
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
  let openListTag = '';

  for (let index = 0; index < body.getNumChildren(); index += 1) {
    const child = body.getChild(index);
    const type = child.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      if (openListTag) {
        html.push('</' + openListTag + '>');
        openListTag = '';
      }

      html.push(paragraphToHtml_(child.asParagraph()));
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      const listItem = child.asListItem();
      const listTag = listTag_(listItem);

      if (openListTag !== listTag) {
        if (openListTag) {
          html.push('</' + openListTag + '>');
        }

        html.push('<' + listTag + '>');
        openListTag = listTag;
      }

      html.push('<li>' + textElementToHtml_(listItem.editAsText()) + '</li>');
    }
  }

  if (openListTag) {
    html.push('</' + openListTag + '>');
  }

  const result = html.join('');
  cache.put(cacheKey, result, CONFIG.CACHE_SECONDS);
  return result;
}

function paragraphToHtml_(paragraph) {
  const text = textElementToHtml_(paragraph.editAsText());

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

function listTag_(listItem) {
  const glyphType = String(listItem.getGlyphType() || '');
  return glyphType.indexOf('NUMBER') >= 0 || glyphType.indexOf('LATIN') >= 0
    ? 'ol'
    : 'ul';
}

function textElementToHtml_(textElement) {
  const text = textElement.getText();

  if (!text) {
    return '';
  }

  const indices = textElement.getTextAttributeIndices();
  const html = [];

  indices.forEach(function (start, position) {
    const end = position + 1 < indices.length ? indices[position + 1] : text.length;
    let fragment = escapeHtml_(text.slice(start, end));
    const linkUrl = textElement.getLinkUrl(start);

    if (textElement.isBold(start)) {
      fragment = '<strong>' + fragment + '</strong>';
    }

    if (textElement.isItalic(start)) {
      fragment = '<em>' + fragment + '</em>';
    }

    if (isSafeDocumentLink_(linkUrl)) {
      fragment = '<a href="' + escapeHtml_(linkUrl) + '">' + fragment + '</a>';
    }

    html.push(fragment);
  });

  return html.join('');
}

function isSafeDocumentLink_(value) {
  return typeof value === 'string' && /^(https?:|mailto:)/i.test(value);
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
