// qa-automation/functions/html-locator-extractor.js
// This function is intended to be pasted into an n8n Function node.
// It takes HTML content from a web page and extracts high-quality
// CSS selectors for interactive elements. It prioritizes data-testid, id,
// unique classes, and semantic selectors while providing fallbacks.

// Input: items[0].json.body (HTML string from HTTP Request node)
//        items[0].json.chatInfo (passthrough from previous nodes)
// Output: [{ json: { success: boolean, locators?: array, error?: string, metadata?: object, chatInfo: object } }]

// Ensure Cheerio is available. In n8n, you might need to ensure it's
// installed in your n8n instance if running custom code that requires external modules.
// For this setup, we assume cheerio is globally available or can be required.
let cheerio;
try {
  cheerio = require('cheerio');
} catch (e) {
  console.error("Cheerio module is not available. Please ensure it's installed in your n8n environment or custom Docker image.");
  // If cheerio is critical and not found, you might want to return an error immediately.
  // For now, we'll let it fail later if htmlContent is processed.
}

const inputItem = items[0].json;
const htmlContent = inputItem.body || inputItem.data || ''; // Accommodate different input structures
const chatInfo = inputItem.chatInfo || {}; // Preserve chatInfo

if (!htmlContent) {
  console.log('No HTML content found in input for chat:', chatInfo.chatId);
  return [{
    json: {
      success: false,
      error: 'No HTML content provided to extract locators from.',
      errorType: 'MISSING_HTML',
      chatInfo: chatInfo
    }
  }];
}

if (!cheerio) {
    return [{
        json: {
            success: false,
            error: "Cheerio library is not available. Cannot parse HTML.",
            errorType: "LIBRARY_MISSING",
            chatInfo: chatInfo
        }
    }];
}

// Configuration for selector extraction
const CONFIG = {
  targetElements: 'button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="tab"], [role="combobox"], [role="listbox"], [role="option"], [role="switch"], [role="textbox"], [role="searchbox"], form, label, [tabindex]',
  selectorAttributes: [
    'data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa',
    'id',
    'name', 'aria-label', 'aria-labelledby', 'title', 'for',
    'placeholder', 'value',
    'href', 'src',
    'class'
  ],
  frameworkAttributes: {
    react: ['data-reactid', /^data-react-\w+/i, /__reactEventHandlers\w*/i, /__reactFiber\w*/i],
    angular: [/^ng-/i, /^\[ng-/i, /^data-ng-/i, /^\[data-ng-/i, /^\*ng/i, /_ngcontent-/i, /_nghost-/i],
    vue: [/^data-v-/i, /^v-/i]
  },
  maxLocators: 100,
  maxSelectorLength: 200, // Increased for potentially longer paths
  maxFallbacks: 3,
  ignoreClasses: [ // Common utility/framework classes to ignore for primary selection
    /active/i, /disabled/i, /focus/i, /hover/i, /selected/i, /open/i, /closed/i,
    /container/i, /wrapper/i, /row/i, /col/i, /grid/i, /flex/i,
    /primary/i, /secondary/i, /success/i, /danger/i, /warning/i, /info/i,
    /^fa-/i, /^glyphicon-/i, /^icon-/i, /^mat-/i, /^ant-/i, /^v-/i, /^bp3-/i, // Icon/UI library prefixes
    /js-/i, /qa-/i // Prefixes that might be too generic if not specific test IDs
  ]
};

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[LocatorExtractor] ${prefix}: ${message}`);
}

function cleanSelector(selector) {
  if (!selector) return '';
  selector = selector.trim().replace(/\s+/g, ' '); // Normalize whitespace

  if (selector.startsWith('#')) {
    const idValue = selector.substring(1);
    if (/^\d|[^a-zA-Z0-9_-]/.test(idValue)) {
      return `#${CSS.escape ? CSS.escape(idValue) : idValue.replace(/([^a-zA-Z0-9_:\-.#\s[\]\\="'])/g, '\\$1')}`;
    }
  }
  // More robust class and attribute selector cleaning
  selector = selector.replace(/\.([^.]+)/g, (match, className) => {
    return `.${CSS.escape ? CSS.escape(className) : className.replace(/([^a-zA-Z0-9_:\-.#\s[\]\\="'])/g, '\\$1')}`;
  });
  selector = selector.replace(/\[([^=\]]+)=["']?([^"']+)["']?\]/g, (match, attr, value) => {
    return `[${CSS.escape ? CSS.escape(attr) : attr}="${CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"')}"]`;
  });
  return selector;
}

function isSelectorUnique($, selector) {
  if (!selector || selector.length > CONFIG.maxSelectorLength) return false;
  try {
    return $(selector).length === 1;
  } catch (e) {
    log(`Invalid selector generated: "${selector}". Error: ${e.message}`, 'warn');
    return false;
  }
}

function getElementText($el) {
    // Get text only from the element itself, not its children, and trim.
    // Clone the element, remove its children, then get text.
    let text = $el.clone().children().remove().end().text().trim();
    if (!text) { // If no direct text, try to get text from immediate children text nodes
        text = $el.contents().filter(function() {
            return this.type === 'text';
        }).text().trim();
    }
    return text.replace(/\s+/g, ' ').substring(0, 100); // Normalize and limit length
}


function generateAttributeSelector($, element) {
  const $el = $(element);
  const tagName = (element.name || $el.prop('tagName') || '').toLowerCase();

  for (const attr of CONFIG.selectorAttributes) {
    let value = $el.attr(attr);
    if (typeof value !== 'string' || !value.trim()) continue;
    value = value.trim();

    let selector = '';
    if (attr === 'id') {
      selector = `#${value}`;
    } else if (attr === 'class') {
      const classes = value.split(/\s+/).filter(c => c.trim() && !CONFIG.ignoreClasses.some(pattern => pattern.test(c)));
      if (classes.length === 0) continue;

      // Try unique class first
      for (const cn of classes) {
        const s = `.${cn}`;
        if (isSelectorUnique($, s)) { selector = s; break; }
      }
      // Try tag + unique class
      if (!selector) {
        for (const cn of classes) {
          const s = `${tagName}.${cn}`;
          if (isSelectorUnique($, s)) { selector = s; break; }
        }
      }
      // Try combination of first two non-ignored classes
      if (!selector && classes.length >= 2) {
        const s = `.${classes[0]}.${classes[1]}`;
        if (isSelectorUnique($, s)) { selector = s; }
      }
      // Try tag + combination
      if (!selector && classes.length >= 2) {
          const s = `${tagName}.${classes[0]}.${classes[1]}`;
          if (isSelectorUnique($, s)) { selector = s; }
      }
      if (!selector) continue; // If no good class selector found

    } else {
      selector = `${tagName}[${attr}="${value.replace(/"/g, '\\"')}"]`;
    }

    const cleaned = cleanSelector(selector);
    if (cleaned && isSelectorUnique($, cleaned)) {
      return {
        selector: cleaned, attribute: attr, value,
        priority: CONFIG.selectorAttributes.indexOf(attr), unique: true
      };
    }
  }
  return null;
}

function generatePositionalSelector($, element) {
  const $el = $(element);
  const tagName = (element.name || $el.prop('tagName') || '').toLowerCase();
  if (!tagName) return null;

  let path = tagName;
  let $current = $el;

  // Try nth-child/nth-of-type relative to parent
  const parent = $current.parent();
  if (parent.length) {
      const siblings = parent.children(tagName);
      if (siblings.length > 1) {
          const index = siblings.index($current) + 1;
          path = `${tagName}:nth-of-type(${index})`; // Prefer nth-of-type
          if (!isSelectorUnique($, path)) {
             path = `${tagName}:nth-child(${parent.children().index($current) + 1})`;
          }
      }
  }
  if (isSelectorUnique($, path)) return { selector: cleanSelector(path), attribute: 'position-simple', value: path, priority: 100, unique: true};


  // Build up path from parent, max 3 levels
  for (let i = 0; i < 3 && $current.parent().length && $current.parent().prop('tagName'); i++) {
    const $parentEl = $current.parent();
    const parentTagName = ($parentEl.prop('tagName') || '').toLowerCase();
    if (parentTagName === 'body' || parentTagName === 'html') {
        path = `${parentTagName} > ${path}`;
        break;
    }

    let parentSegment = parentTagName;
    const parentId = $parentEl.attr('id');
    if (parentId && isSelectorUnique($, `#${parentId}`)) { // If parent has unique ID, use it
        parentSegment = `#${parentId}`;
        path = `${parentSegment} > ${path}`;
        break; 
    }

    const siblings = $parentEl.siblings(parentTagName).addBack();
    if (siblings.length > 1) {
      const index = siblings.index($parentEl) + 1;
      parentSegment = `${parentTagName}:nth-of-type(${index})`;
    }
    path = `${parentSegment} > ${path}`;
    if (isSelectorUnique($, path)) break; // Stop if unique path found
    $current = $parentEl;
  }

  const cleaned = cleanSelector(path);
  if (cleaned && isSelectorUnique($, cleaned)) {
    return { selector: cleaned, attribute: 'position-path', value: path, priority: 110, unique: true };
  }
  return null;
}

function generateTextSelector($, element) {
  const $el = $(element);
  const tagName = (element.name || $el.prop('tagName') || '').toLowerCase();
  if (!tagName) return null;

  const text = getElementText($el);
  if (!text || text.length > 100) return null; // Avoid very long text

  // Try exact text match using Cypress-like :contains (Cheerio needs custom filter)
  // Cheerio's :contains is case-sensitive. For robustness, one might implement case-insensitive.
  // For n8n Function node, keep it simple or use exact match.
  // This requires a custom Cheerio filter for exact text match.
  $.expr[':'].exactText = (el, i, meta) => $(el).text().trim() === meta[3];
  let selector = `${tagName}:exactText("${text.replace(/"/g, '\\"')}")`;
  
  if (isSelectorUnique($, selector)) {
    return { selector: cleanSelector(selector), attribute: 'text-exact', value: text, priority: 120, unique: true };
  }

  // Fallback to substring contains if exact fails (less reliable)
  selector = `${tagName}:contains("${text.replace(/"/g, '\\"')}")`;
  if (isSelectorUnique($, selector)) {
    return { selector: cleanSelector(selector), attribute: 'text-contains', value: text, priority: 125, unique: true };
  }
  return null;
}


function detectFramework($) {
  for (const fw in CONFIG.frameworkAttributes) {
    for (const attrPattern of CONFIG.frameworkAttributes[fw]) {
      let selector = '';
      if (typeof attrPattern === 'string') {
        // Handles simple string attributes like 'data-reactid' or prefixes like 'ng-'
        if (attrPattern.startsWith('[') && attrPattern.endsWith(']')) { // full attribute selector
            selector = attrPattern;
        } else if (attrPattern.includes('-')) { // attribute name prefix
            selector = `[${attrPattern}*=""]`; // checks if an attribute name STARTS WITH the pattern
             // This is a simplification. A more robust check would iterate all attributes of some elements.
             // For performance, we use a simpler check here.
             if ($(`[${attrPattern}*]`).length > 0) return fw; // Check if any element has an attribute starting with this
             // A more precise check would be to iterate attributes:
             // $('*').each((i, el) => { Object.keys(el.attribs).forEach(a => { if (a.startsWith(attrPattern)) found=true; }); });
        } else { // specific attribute name
            selector = `[${attrPattern}]`;
        }
      } else if (attrPattern instanceof RegExp) {
        // For regex, we'd need to iterate attributes of elements, which is slow.
        // As a proxy, check if common tags might have such attributes.
        // This is a heuristic.
        let found = false;
        $('button, input, div, span, a').each((i, el) => {
          Object.keys(el.attribs).forEach(a => {
            if (attrPattern.test(a)) {
              found = true;
              return false; // break .each
            }
          });
          if (found) return false; // break outer .each
        });
        if (found) return fw;
      }
      if (selector && $(selector).length > 0) return fw;
    }
  }
  return 'generic';
}


function generateAllSelectors($, element, framework) {
  const selectors = [];
  const strategies = [
    () => generateAttributeSelector($, element),
    // Framework-specific could be added here if needed, but attribute selector covers data-*
    () => generateTextSelector($, element), // Text selector before positional for more human-readable locators
    () => generatePositionalSelector($, element)
  ];

  for (const strategy of strategies) {
    const s = strategy();
    if (s && s.selector && !selectors.find(ex => ex.selector === s.selector)) { // Ensure unique selectors
        selectors.push(s);
    }
  }
  selectors.sort((a, b) => a.priority - b.priority);
  return selectors;
}

function extractElementInfo($, element) {
  const $el = $(element);
  const tagName = (element.name || $el.prop('tagName') || '').toLowerCase();
  return {
    tagName,
    id: $el.attr('id') || '',
    classes: ($el.attr('class') || '').split(/\s+/).filter(c => c.trim()),
    text: getElementText($el).substring(0,50), // Limit text length
    attributes: Object.fromEntries(
        Object.entries(element.attribs || {}).slice(0, 5) // Limit number of attributes shown
    )
  };
}

function isPotentiallyUseful($el) {
    // Heuristic: is it visible (not type hidden, not display:none, not visibility:hidden)
    // Cheerio doesn't evaluate styles, so this is limited.
    if ($el.attr('type') === 'hidden' || $el.css('display') === 'none' || $el.css('visibility') === 'hidden') {
        return false;
    }
    // Heuristic: does it have some content or identifying attributes?
    if (getElementText($el) || $el.attr('id') || $el.attr('name') || $el.attr('data-testid')) {
        return true;
    }
    // Heuristic: is it an interactive element type?
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    if (interactiveTags.includes(($el.prop('tagName')||'').toLowerCase())) {
        return true;
    }
    return false;
}


// Main function to extract locators from HTML
try {
  const $ = cheerio.load(htmlContent);
  const framework = detectFramework($);
  log(`Detected framework: ${framework}`);

  const elements = $(CONFIG.targetElements);
  log(`Found ${elements.length} potential target elements.`);

  const extractedLocators = [];
  let locatorCounter = 1;

  elements.each((index, element) => {
    if (extractedLocators.length >= CONFIG.maxLocators) return false; // Stop if max locators reached

    const $el = $(element);
    if(!isPotentiallyUseful($el)) return; // Skip elements that are likely not useful

    const selectors = generateAllSelectors($, element, framework);
    if (selectors.length === 0) return;

    const elementInfo = extractElementInfo($, element);
    const primarySelector = selectors[0];

    extractedLocators.push({
      id: `LOCATOR_${locatorCounter++}`,
      primary: primarySelector.selector,
      fallbacks: selectors.slice(1, CONFIG.maxFallbacks + 1).map(s => s.selector),
      element: elementInfo,
      selectorDetails: primarySelector // Details of the primary selector chosen
    });
  });

  log(`Successfully extracted ${extractedLocators.length} locators.`);

  return [{
    json: {
      success: true,
      locators: extractedLocators,
      metadata: {
        framework,
        targetElementsFound: elements.length,
        extractedLocatorsCount: extractedLocators.length,
        timestamp: new Date().toISOString()
      },
      chatInfo: chatInfo
    }
  }];

} catch (error) {
  log(`Error extracting locators: ${error.message}\nStack: ${error.stack}`, 'error');
  return [{
    json: {
      success: false,
      error: `Error extracting locators: ${error.message}`,
      errorType: 'EXTRACTION_ERROR',
      stack: error.stack,
      chatInfo: chatInfo
    }
  }];
}
