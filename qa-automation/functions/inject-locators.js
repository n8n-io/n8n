// qa-automation/functions/inject-locators.js
// This function is intended to be pasted into an n8n Function node.
// It injects extracted CSS selectors into Cypress test code containing
// {{LOCATOR_n}} placeholders. It handles validation, logging, and
// provides detailed information about the injection process.

// Input: items[0].json (contains 'cypressCode', 'locators', 'chatInfo')
// Output: [{ json: { success: boolean, code?: string, error?: string, metadata?: object, chatInfo: object } }]

const inputData = items[0].json;

if (!inputData || !inputData.cypressCode || !inputData.locators || !inputData.chatInfo) {
  console.error('Error: Invalid input data. Missing cypressCode, locators, or chatInfo.');
  return [{
    json: {
      success: false,
      error: 'Invalid input: Missing Cypress code, locators, or chat information.',
      errorType: 'INVALID_INPUT_DATA',
      chatInfo: inputData?.chatInfo || {}
    }
  }];
}

const { cypressCode, locators, chatInfo } = inputData;

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[InjectLocators] ${prefix}: ${message}`);
}

// Function to find and extract details about placeholders in the code
function findPlaceholders(code) {
  const placeholderRegex = /{{LOCATOR_(\d+)}}(\s*\/\*\s*([^*]+)\s*\*\/)?/g;
  const placeholders = [];
  let match;

  while ((match = placeholderRegex.exec(code)) !== null) {
    placeholders.push({
      original: match[0], // The full placeholder string including any comment
      id: parseInt(match[1], 10), // The numeric ID
      position: match.index, // Position in the code
      comment: match[3] ? match[3].trim() : '' // The comment text if present
    });
  }

  return placeholders;
}

// Function to inject locators into the code
function injectLocators(code, locatorsList, placeholders) {
  let injectedCode = code;
  let offset = 0; // Track position offset as we modify the string

  // Sort placeholders by position (descending) to avoid position shifts when replacing
  const sortedPlaceholders = [...placeholders].sort((a, b) => b.position - a.position);

  // Track which locators were used and which placeholders couldn't be filled
  const usedLocators = new Set();
  const missingLocators = [];

  for (const placeholder of sortedPlaceholders) {
    const locatorId = placeholder.id;
    const locator = locatorsList.find(l => l.id === `LOCATOR_${locatorId}`);

    if (locator) {
      // Replace the placeholder with the actual selector
      const replacement = `'${locator.primary}'`; // Wrap in quotes for Cypress
      const startPos = placeholder.position + offset;
      const endPos = startPos + placeholder.original.length;
      injectedCode = injectedCode.substring(0, startPos) + replacement + injectedCode.substring(endPos);
      
      // Update offset for future replacements
      offset += replacement.length - placeholder.original.length;
      
      // Mark this locator as used
      usedLocators.add(locator.id);
    } else {
      missingLocators.push(placeholder);
    }
  }

  return {
    code: injectedCode,
    usedLocators: Array.from(usedLocators),
    missingLocators: missingLocators.map(p => ({ id: p.id, comment: p.comment }))
  };
}

// Main execution
try {
  log(`Processing Cypress code for chat ${chatInfo.chatId}`);
  
  // Find all placeholders in the code
  const placeholders = findPlaceholders(cypressCode);
  log(`Found ${placeholders.length} placeholders in the Cypress code`);
  
  // Inject locators into the code
  const result = injectLocators(cypressCode, locators, placeholders);
  
  // Log results
  log(`Successfully injected ${result.usedLocators.length} locators into the Cypress code`);
  if (result.missingLocators.length > 0) {
    log(`Warning: Could not find locators for ${result.missingLocators.length} placeholders`, 'warn');
    result.missingLocators.forEach(missing => {
      log(`Missing locator for placeholder LOCATOR_${missing.id}${missing.comment ? ` (${missing.comment})` : ''}`, 'warn');
    });
  }
  
  return [{
    json: {
      success: true,
      code: result.code,
      metadata: {
        totalPlaceholders: placeholders.length,
        injectedLocators: result.usedLocators.length,
        missingLocators: result.missingLocators.length,
        missingDetails: result.missingLocators
      },
      chatInfo
    }
  }];
} catch (error) {
  log(`Error injecting locators for chat ${chatInfo.chatId}: ${error.message}\nStack: ${error.stack}`, 'error');
  
  return [{
    json: {
      success: false,
      error: `An error occurred while injecting locators: ${error.message}`,
      errorType: 'LOCATOR_INJECTION_ERROR',
      stack: error.stack,
      chatInfo
    }
  }];
}