// qa-automation/functions/html-locator-extractor.js
// This function is intended to be pasted into an n8n Function node.
// It extracts CSS selectors from HTML content, prioritizing data-testid,
// id, unique classes, and semantic selectors, with fallbacks.

// Input: items[0].json (contains 'html', 'chatInfo')
// Output: [{ json: { success: boolean, locators?: object[], error?: string, chatInfo: object } }]

const inputData = items[0].json;

if (!inputData || !inputData.html || !inputData.chatInfo) {
  console.error('Error: Invalid input data. Missing html or chatInfo.');
  return [{
    json: {
      success: false,
      error: 'Invalid input: Missing HTML content or chat information.',
      errorType: 'INVALID_INPUT_DATA',
      chatInfo: inputData?.chatInfo || {}
    }
  }];
}

const { html, chatInfo } = inputData;

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[HTMLLocatorExtractor] ${prefix}: ${message}`);
}

// Check if Cheerio is available
if (typeof $ !== 'function') {
  log('Cheerio is not available. This function requires Cheerio to parse HTML.', 'error');
  return [{
    json: {
      success: false,
      error: 'Cheerio library is not available. Make sure this function is run in an environment with Cheerio.',
      errorType: 'MISSING_DEPENDENCY',
      chatInfo
    }
  }];
}

// Function to extract locators from HTML
function extractLocators(htmlContent) {
  try {
    // Load HTML with Cheerio
    const $ = cheerio.load(htmlContent);
    const locators = [];
    
    // Find all interactive elements and elements that might need to be verified
    const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="searchbox"], [role="textbox"], [role="combobox"], [role="listbox"], [role="slider"], [role="spinbutton"], [role="menu"], [role="menubar"], [role="dialog"], [role="alertdialog"], [role="tooltip"], [role="navigation"], [role="complementary"], [role="banner"], [role="main"], [role="form"], [role="search"], [role="region"], [role="tabpanel"], [role="tablist"], [role="presentation"], [role="none"], [role="status"], [role="alert"], [role="log"], [role="marquee"], [role="timer"], [role="progressbar"], [role="heading"], [role="img"], [role="separator"], [role="article"], [role="document"], [role="application"], [role="group"], [role="toolbar"], [role="grid"], [role="row"], [role="gridcell"], [role="columnheader"], [role="rowheader"], [role="cell"], [role="table"], [role="definition"], [role="term"], [role="directory"], [role="list"], [role="listitem"], [role="math"], [role="note"], [role="contentinfo"], [role="figure"], [role="feed"], [role="meter"], [role="treegrid"], [role="tree"], [role="treeitem"]';
    
    // Also include elements that might need verification
    const verifiableSelectors = 'h1, h2, h3, h4, h5, h6, p, span, div, label, li, td, th';
    
    // Combine selectors
    const allSelectors = `${interactiveSelectors}, ${verifiableSelectors}`;
    
    // Track used selectors to avoid duplicates
    const usedSelectors = new Set();
    
    // Function to get a unique selector for an element
    function getUniqueSelector(element) {
      const $el = $(element);
      
      // Priority 1: data-testid attribute (best for testing)
      if ($el.attr('data-testid')) {
        return { 
          selector: `[data-testid="${$el.attr('data-testid')}"]`,
          type: 'data-testid',
          confidence: 'high'
        };
      }
      
      // Priority 2: data-cy or data-test attribute (also good for testing)
      if ($el.attr('data-cy')) {
        return { 
          selector: `[data-cy="${$el.attr('data-cy')}"]`,
          type: 'data-cy',
          confidence: 'high'
        };
      }
      
      if ($el.attr('data-test')) {
        return { 
          selector: `[data-test="${$el.attr('data-test')}"]`,
          type: 'data-test',
          confidence: 'high'
        };
      }
      
      // Priority 3: id attribute
      if ($el.attr('id')) {
        return { 
          selector: `#${$el.attr('id')}`,
          type: 'id',
          confidence: 'high'
        };
      }
      
      // Priority 4: unique class (if there's only one element with this class)
      const classes = ($el.attr('class') || '').split(/\s+/).filter(Boolean);
      for (const className of classes) {
        if ($(`.${className}`).length === 1) {
          return { 
            selector: `.${className}`,
            type: 'unique-class',
            confidence: 'medium'
          };
        }
      }
      
      // Priority 5: element with text content (for buttons, links, etc.)
      const tagName = $el.prop('tagName').toLowerCase();
      const text = $el.text().trim();
      if (text && ['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'p'].includes(tagName)) {
        // Escape single quotes in text
        const escapedText = text.replace(/'/g, "\\'");
        return { 
          selector: `${tagName}:contains('${escapedText}')`,
          type: 'text-content',
          confidence: 'medium'
        };
      }
      
      // Priority 6: element with name attribute
      if ($el.attr('name')) {
        return { 
          selector: `[name="${$el.attr('name')}"]`,
          type: 'name-attribute',
          confidence: 'medium'
        };
      }
      
      // Priority 7: element with placeholder attribute
      if ($el.attr('placeholder')) {
        return { 
          selector: `[placeholder="${$el.attr('placeholder')}"]`,
          type: 'placeholder',
          confidence: 'medium'
        };
      }
      
      // Priority 8: element with type and value (for inputs)
      if (tagName === 'input' && $el.attr('type') && $el.attr('value')) {
        return { 
          selector: `input[type="${$el.attr('type')}"][value="${$el.attr('value')}"]`,
          type: 'input-type-value',
          confidence: 'medium'
        };
      }
      
      // Priority 9: element with aria-label
      if ($el.attr('aria-label')) {
        return { 
          selector: `[aria-label="${$el.attr('aria-label')}"]`,
          type: 'aria-label',
          confidence: 'medium'
        };
      }
      
      // Priority 10: element with role
      if ($el.attr('role')) {
        // Count how many elements have this role
        const roleCount = $(`[role="${$el.attr('role')}"]`).length;
        if (roleCount === 1) {
          return { 
            selector: `[role="${$el.attr('role')}"]`,
            type: 'unique-role',
            confidence: 'medium'
          };
        }
      }
      
      // Priority 11: nth-child selector as a last resort
      const parent = $el.parent();
      const children = parent.children();
      const index = children.index(element) + 1;
      
      return { 
        selector: `${tagName}:nth-child(${index})`,
        type: 'nth-child',
        confidence: 'low',
        note: 'This is a fallback selector and may be brittle if the DOM structure changes.'
      };
    }
    
    // Process all elements
    $(allSelectors).each((index, element) => {
      const selectorInfo = getUniqueSelector(element);
      
      // Skip if we've already used this selector
      if (usedSelectors.has(selectorInfo.selector)) {
        return;
      }
      
      usedSelectors.add(selectorInfo.selector);
      
      // Get element metadata
      const $el = $(element);
      const tagName = $el.prop('tagName').toLowerCase();
      const text = $el.text().trim();
      const type = $el.attr('type') || '';
      const isVisible = $el.is(':visible'); // Note: This might not work perfectly in Cheerio
      
      // Create a description of the element
      let description = tagName;
      if (type) description += ` type="${type}"`;
      if (text && text.length <= 50) description += ` with text "${text}"`;
      else if (text) description += ` with text "${text.substring(0, 47)}..."`;
      
      // Add to locators array
      locators.push({
        selector: selectorInfo.selector,
        selectorType: selectorInfo.type,
        confidence: selectorInfo.confidence,
        description,
        tagName,
        text: text.length <= 100 ? text : text.substring(0, 97) + '...',
        isVisible,
        note: selectorInfo.note || ''
      });
    });
    
    return locators;
  } catch (error) {
    log(`Error extracting locators: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
try {
  log(`Processing HTML content for chat ${chatInfo.chatId}`);
  
  // Extract locators from HTML
  const locators = extractLocators(html);
  
  log(`Successfully extracted ${locators.length} locators from HTML`);
  
  return [{
    json: {
      success: true,
      locators,
      metadata: {
        locatorCount: locators.length,
        highConfidenceCount: locators.filter(l => l.confidence === 'high').length,
        mediumConfidenceCount: locators.filter(l => l.confidence === 'medium').length,
        lowConfidenceCount: locators.filter(l => l.confidence === 'low').length
      },
      chatInfo
    }
  }];
} catch (error) {
  log(`Error processing HTML for chat ${chatInfo.chatId}: ${error.message}\nStack: ${error.stack}`, 'error');
  
  return [{
    json: {
      success: false,
      error: `An error occurred while extracting locators: ${error.message}`,
      errorType: 'LOCATOR_EXTRACTION_ERROR',
      stack: error.stack,
      chatInfo
    }
  }];
}