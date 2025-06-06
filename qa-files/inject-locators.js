// qa-automation/functions/inject-locators.js
// This function is intended to be pasted into an n8n Function node.
// It takes Cypress test code with placeholder locators ({{LOCATOR_n}})
// and injects actual CSS selectors extracted from HTML analysis.

// Input: items[0].json (from Process Code node - contains 'code', 'specFileName', 'chatInfo')
//        items[1].json (from Extract Locators node - contains 'locators', 'chatInfo')
// Output: [{ json: { success: boolean, code?: string, error?: string, ... chatInfo: object } }]

const codeInput = items.find(item => item.json.hasOwnProperty('code'));
const locatorsInput = items.find(item => item.json.hasOwnProperty('locators'));

if (!codeInput || !codeInput.json.code) {
  console.error('Error: Missing Cypress code input.');
  return [{ json: { success: false, error: 'Cypress code input is missing.', errorType: 'MISSING_CODE_INPUT', chatInfo: items[0]?.json?.chatInfo || {} } }];
}
if (!locatorsInput || !Array.isArray(locatorsInput.json.locators)) {
  console.error('Error: Missing or invalid locators input.');
  return [{ json: { success: false, error: 'Locators input is missing or invalid.', errorType: 'MISSING_LOCATORS_INPUT', chatInfo: items[0]?.json?.chatInfo || {} } }];
}

const cypressCode = codeInput.json.code;
const specFileName = codeInput.json.specFileName; // Keep specFileName
const targetUrl = codeInput.json.targetUrl; // Keep targetUrl
const locators = locatorsInput.json.locators;
const chatInfo = codeInput.json.chatInfo || locatorsInput.json.chatInfo || {}; // Prioritize chatInfo from code input

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[InjectLocators] ${prefix}: ${message}`);
}

function findPlaceholders(code) {
  const placeholderRegex = /\{\{(LOCATOR_\d+)\}\}/g; // Adjusted regex to capture LOCATOR_X
  const placeholders = {};
  let match;
  while ((match = placeholderRegex.exec(code)) !== null) {
    const placeholderId = match[1]; // This is "LOCATOR_X"
    const originalPlaceholder = match[0]; // This is "{{LOCATOR_X}}"
    const startPos = match.index;
    const endPos = startPos + originalPlaceholder.length;
    const lineStart = code.lastIndexOf('\n', startPos) + 1;
    const lineEnd = code.indexOf('\n', endPos);
    const context = code.substring(lineStart, lineEnd > -1 ? lineEnd : code.length).trim();
    const commentMatch = context.match(/\/\*\s*(.+?)\s*\*\//);
    const comment = commentMatch ? commentMatch[1].trim() : '';

    placeholders[placeholderId] = {
      originalString: originalPlaceholder,
      id: placeholderId, // Store the ID like "LOCATOR_1"
      startPos,
      endPos,
      context,
      comment
    };
  }
  return placeholders;
}

function matchPlaceholderToLocator(placeholderId, availableLocators) {
  // Match by the ID (e.g., "LOCATOR_1")
  return availableLocators.find(loc => loc.id === placeholderId);
}

function generateSelectorString(locator) {
  if (!locator || !locator.primary) return "'.LOCATOR_NOT_FOUND_IN_HTML'";

  const selectors = [locator.primary];
  if (locator.fallbacks && locator.fallbacks.length > 0) {
    selectors.push(...locator.fallbacks);
  }

  // Escape single quotes within selectors for use in JS strings
  const escapedSelectors = selectors.map(s => s.replace(/'/g, "\\'"));

  if (escapedSelectors.length === 1) {
    return `'${escapedSelectors[0]}'`;
  } else {
    // Use Cypress's ability to take multiple comma-separated selectors
    // This effectively means "find an element matching any of these selectors"
    return `'${escapedSelectors.join(', ')}'`;
    // If a "try one by one" strategy is needed, a custom Cypress command is better.
    // For now, this is simpler and often sufficient.
    // Example for custom command: `cy.getWithFallback(['${escapedSelectors.join("', '")}'])`
  }
}

function generateLocatorComment(locator, placeholder) {
  if (!locator || !locator.element) {
    return `/* ${placeholder.id} - No HTML element details found. Original comment: ${placeholder.comment || 'N/A'} */`;
  }
  const el = locator.element;
  let comment = `/* ${placeholder.id} for ${el.tagName || 'element'}`;
  if (el.id) comment += ` #${el.id}`;
  if (el.name) comment += ` [name="${el.name}"]`;
  if (el.text && el.text.trim()) {
    const snippet = el.text.trim().substring(0, 30);
    comment += ` (text: "${snippet}${el.text.trim().length > 30 ? '...' : ''}")`;
  }
  if (placeholder.comment && placeholder.comment !== "N/A") {
      comment += ` - User hint: ${placeholder.comment}`;
  }
  comment += ` */`;
  return comment;
}

// Basic JS syntax validation
function validateSyntax(code) {
  try {
    new Function(code); // This will throw an error if syntax is invalid
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

try {
  log(`Starting locator injection. Available locators: ${locators.length}`);
  const placeholdersMap = findPlaceholders(cypressCode);
  const placeholderIds = Object.keys(placeholdersMap);
  log(`Found ${placeholderIds.length} placeholders in code.`);

  if (placeholderIds.length === 0) {
    log('No placeholders to inject. Returning original code.');
    return [{ json: { 
        success: true, 
        code: cypressCode, 
        message: 'No placeholders found in the generated code.',
        placeholdersFound: 0,
        locatorsInjected: 0,
        specFileName, // Pass through
        targetUrl,    // Pass through
        chatInfo 
    }}];
  }

  let modifiedCode = cypressCode;
  let injectedCount = 0;

  // Sort placeholders by start position in descending order to avoid index shifting issues
  const sortedPlaceholders = placeholderIds.map(id => placeholdersMap[id]).sort((a, b) => b.startPos - a.startPos);

  for (const placeholder of sortedPlaceholders) {
    const matchedLocator = matchPlaceholderToLocator(placeholder.id, locators);
    
    let replacementString;
    if (matchedLocator) {
      const selectorStr = generateSelectorString(matchedLocator);
      const commentStr = generateLocatorComment(matchedLocator, placeholder);
      replacementString = `${selectorStr} ${commentStr}`;
      injectedCount++;
      log(`Injecting for ${placeholder.id}: ${selectorStr}`);
    } else {
      replacementString = `'${placeholder.id}_NOT_EXTRACTED' /* Original hint: ${placeholder.comment || 'N/A'} */`;
      log(`No locator found for ${placeholder.id}. Original hint: ${placeholder.comment || 'N/A'}`, 'warn');
    }
    
    modifiedCode = modifiedCode.substring(0, placeholder.startPos) + 
                   replacementString + 
                   modifiedCode.substring(placeholder.endPos);
  }

  const syntaxCheck = validateSyntax(modifiedCode);
  if (!syntaxCheck.valid) {
    log(`Syntax error after injection: ${syntaxCheck.error}`, 'error');
    return [{ json: { 
      success: false, 
      error: `Generated code has syntax errors after locator injection: ${syntaxCheck.error}`, 
      errorType: 'INVALID_SYNTAX_POST_INJECTION',
      originalCode: cypressCode, // For debugging
      problematicCode: modifiedCode,
      chatInfo
    }}];
  }

  log(`Successfully injected ${injectedCount} of ${placeholderIds.length} locators.`);
  return [{ json: {
    success: true,
    code: modifiedCode,
    message: `Successfully injected ${injectedCount} of ${placeholderIds.length} locators.`,
    placeholdersFound: placeholderIds.length,
    locatorsInjected: injectedCount,
    specFileName, // Pass through
    targetUrl,    // Pass through
    chatInfo
  }}];

} catch (error) {
  log(`Error during locator injection: ${error.message}\nStack: ${error.stack}`, 'error');
  return [{ json: { 
    success: false, 
    error: `An unexpected error occurred during locator injection: ${error.message}`,
    errorType: 'INJECTION_PROCESS_ERROR',
    stack: error.stack,
    chatInfo
  }}];
}
