import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const projectRoot = new URL('../', import.meta.url);

function textChild(value) {
  const text = {
    getText() {
      return value;
    },
    getTextAttributeIndices() {
      return [0];
    },
    getLinkUrl() {
      return null;
    },
    isBold() {
      return false;
    },
    isItalic() {
      return false;
    },
  };

  return {
    getType() {
      return 'TEXT';
    },
    asText() {
      return text;
    },
  };
}

const imageChild = {
  getType() {
    return 'INLINE_IMAGE';
  },
  asInlineImage() {
    return {
      getBlob() {
        return {
          getContentType() {
            return 'image/png';
          },
          getBytes() {
            return [1, 2, 3];
          },
        };
      },
      getAltDescription() {
        return 'Map & plan';
      },
      getAltTitle() {
        return '';
      },
    };
  },
};

const paragraph = {
  getNumChildren() {
    return 3;
  },
  getChild(index) {
    return [textChild('Before '), imageChild, textChild(' after')][index];
  },
  getHeading() {
    return 'NORMAL';
  },
};

const context = vm.createContext({
  console,
  CONFIG: {
    CACHE_SECONDS: 60,
  },
  CacheService: {
    getScriptCache() {
      return {
        get() {
          return null;
        },
        put() {},
      };
    },
  },
  DocumentApp: {
    ElementType: {
      PARAGRAPH: 'PARAGRAPH',
      LIST_ITEM: 'LIST_ITEM',
      TEXT: 'TEXT',
      INLINE_IMAGE: 'INLINE_IMAGE',
    },
    ParagraphHeading: {
      HEADING1: 'HEADING1',
      NORMAL: 'NORMAL',
    },
    openById() {
      return {
        getBody() {
          return {
            getNumChildren() {
              return 1;
            },
            getChild() {
              return {
                getType() {
                  return 'PARAGRAPH';
                },
                asParagraph() {
                  return paragraph;
                },
              };
            },
          };
        },
      };
    },
  },
  Utilities: {
    base64Encode(bytes) {
      return Buffer.from(bytes).toString('base64');
    },
  },
});

const source = fs.readFileSync(new URL('apps-script/ContentService.gs', projectRoot), 'utf8');
vm.runInContext(source, context, {
  filename: 'apps-script/ContentService.gs',
});

const html = vm.runInContext("getDocumentHtml_('document-id')", context);
assert.equal(
  html,
  '<p>Before <img src="data:image/png;base64,AQID" alt="Map &amp; plan"> after</p>',
);

console.log('Apps Script Google Docs image extraction tests passed.');
