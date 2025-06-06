// qa-automation/functions/parse-gherkin.js
// This function is intended to be pasted into an n8n Function node.
// It parses Gherkin syntax from Telegram messages, validates format,
// extracts test components, and prepares data for the DeepSeek API conversion.

// Input: items[0].json.message.text (Gherkin text from Telegram)
//        items[0].json.message.chat.id
//        items[0].json.message.message_id
//        items[0].json.message.from (user info)
// Output: [{ json: { success: boolean, gherkin?: string, error?: string, metadata?: object, components?: object, chatInfo: object } }]

const inputItem = items[0].json; // Standard n8n input

// Ensure message and chat objects exist
if (!inputItem || !inputItem.message || !inputItem.message.chat || !inputItem.message.from) {
  console.error('Error: Missing critical input data (message, chat, or from object).');
  return [{
    json: {
      success: false,
      error: 'Critical input data missing from Telegram trigger.',
      errorType: 'MISSING_INPUT_STRUCTURE',
      chatInfo: { // Attempt to provide some chat info if possible, otherwise null
        chatId: inputItem?.message?.chat?.id || null,
        messageId: inputItem?.message?.message_id || null
      }
    }
  }];
}

const lines = inputItem.message.text ? inputItem.message.text.trim() : '';

// Store chat info for later responses
const chatInfo = {
  chatId: inputItem.message.chat.id,
  messageId: inputItem.message.message_id,
  firstName: inputItem.message.from.first_name || '',
  lastName: inputItem.message.from.last_name || '',
  username: inputItem.message.from.username || ''
};

if (!lines) {
  console.log('No message text found in Telegram input for chat:', chatInfo.chatId);
  return [{
    json: {
      success: false,
      error: 'No Gherkin text provided. Please send your test specification.',
      errorType: 'MISSING_TEXT',
      chatInfo: chatInfo
    }
  }];
}

// Define Gherkin keywords for validation
const GHERKIN_KEYWORDS = {
  feature: ['Feature:'],
  scenario: ['Scenario:', 'Scenario Outline:'],
  background: ['Background:'],
  steps: ['Given ', 'When ', 'Then ', 'And ', 'But '],
  examples: ['Examples:', 'Scenarios:']
};

// Helper function to log with timestamp (n8n's console already timestamps)
function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[ParseGherkin] ${prefix}: ${message}`);
}

// Helper function to validate Gherkin syntax
function validateGherkin(textLines) {
  const errors = [];
  let hasFeature = false;
  let hasScenario = false;
  let hasSteps = false;

  if (!textLines || textLines.length === 0) {
    errors.push('No Gherkin content provided after trimming.');
    return { valid: false, errors };
  }

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i].trim();

    if (line === '' || line.startsWith('#')) continue;

    if (GHERKIN_KEYWORDS.feature.some(kw => line.startsWith(kw))) {
      hasFeature = true;
      continue;
    }
    if (GHERKIN_KEYWORDS.scenario.some(kw => line.startsWith(kw))) {
      hasScenario = true;
      continue;
    }
    if (GHERKIN_KEYWORDS.steps.some(kw => line.startsWith(kw))) {
      hasSteps = true;
      continue;
    }
  }

  if (!hasFeature) errors.push('Missing "Feature:" definition.');
  if (!hasScenario) errors.push('Missing "Scenario:" or "Scenario Outline:" definition.');
  if (!hasSteps) errors.push('Missing Gherkin steps (Given/When/Then/And/But).');

  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to extract components from Gherkin
function extractGherkinComponents(textLines) {
  const components = {
    feature: '',
    scenarios: [],
    currentScenario: null,
    background: null
  };

  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i].trim();

    if (line === '' || line.startsWith('#')) continue;

    if (GHERKIN_KEYWORDS.feature.some(kw => line.startsWith(kw))) {
      components.feature = line;
      continue;
    }

    if (GHERKIN_KEYWORDS.background.some(kw => line.startsWith(kw))) {
      components.background = {
        name: line,
        steps: []
      };
      while (i + 1 < textLines.length) {
        const nextLine = textLines[i + 1].trim();
        if (nextLine === '' || nextLine.startsWith('#')) {
          i++;
          continue;
        }
        if (GHERKIN_KEYWORDS.steps.some(kw => nextLine.startsWith(kw))) {
          components.background.steps.push(nextLine);
          i++;
        } else {
          break;
        }
      }
      continue;
    }

    if (GHERKIN_KEYWORDS.scenario.some(kw => line.startsWith(kw))) {
      components.currentScenario = {
        name: line,
        steps: [],
        examples: [] // Initialize examples array
      };
      components.scenarios.push(components.currentScenario);
      continue;
    }

    if (components.currentScenario && GHERKIN_KEYWORDS.examples.some(kw => line.startsWith(kw))) {
      const exampleRows = [];
      // Look for the header row first
      if (i + 1 < textLines.length && textLines[i+1].includes('|')) {
          exampleRows.push(textLines[i+1].trim()); // Add header
          i++; // Move past header
          while (i + 1 < textLines.length) {
            const nextLine = textLines[i + 1].trim();
            if (nextLine === '' || nextLine.startsWith('#')) {
              i++;
              continue;
            }
            if (nextLine.includes('|')) {
              exampleRows.push(nextLine);
              i++;
            } else {
              break;
            }
          }
      }
      if (exampleRows.length > 0) {
        components.currentScenario.examples = exampleRows;
      }
      continue;
    }

    if (components.currentScenario && GHERKIN_KEYWORDS.steps.some(kw => line.startsWith(kw))) {
      components.currentScenario.steps.push(line);
      continue;
    }
  }
  return components;
}

// Helper function to format Gherkin for DeepSeek
function formatForDeepSeek(components) {
  let formatted = components.feature + '\n\n';

  if (components.background) {
    formatted += components.background.name + '\n';
    components.background.steps.forEach(step => {
      formatted += '  ' + step + '\n';
    });
    formatted += '\n';
  }

  components.scenarios.forEach(scenario => {
    formatted += scenario.name + '\n';
    scenario.steps.forEach(step => {
      formatted += '  ' + step + '\n';
    });
    if (scenario.examples && scenario.examples.length > 0) {
      formatted += '\n  Examples:\n'; // Ensure "Examples:" keyword is present
      scenario.examples.forEach(example => {
        formatted += '    ' + example + '\n';
      });
    }
    formatted += '\n';
  });
  return formatted.trim();
}

// Main processing logic
try {
  const lineArray = lines.split('\n')
    .map(line => line.trim()) // Trim each line individually
    .filter(line => line.length > 0 || line.includes('|')); // Keep lines with content or example table pipes

  const validation = validateGherkin(lineArray);

  if (!validation.valid) {
    log(`Validation failed for chat ${chatInfo.chatId}: ${validation.errors.join(', ')}`, 'error');
    return [{
      json: {
        success: false,
        error: `Invalid Gherkin format: ${validation.errors.join(', ')}`,
        errorType: 'INVALID_GHERKIN',
        rawText: lines,
        chatInfo: chatInfo
      }
    }];
  }

  const components = extractGherkinComponents(lineArray);
  const formattedGherkin = formatForDeepSeek(components);

  const featureName = components.feature.replace(/Feature:\s*/i, '').trim();
  const scenarioCount = components.scenarios.length;
  const stepCount = components.scenarios.reduce((count, scenario) =>
    count + scenario.steps.length, 0) + (components.background ? components.background.steps.length : 0);

  log(`Successfully parsed Gherkin for chat ${chatInfo.chatId}: Feature "${featureName}" with ${scenarioCount} scenarios and ${stepCount} steps`);

  return [{
    json: {
      success: true,
      gherkin: formattedGherkin,
      rawText: lines, // Original raw text for reference
      metadata: {
        featureName,
        scenarioCount,
        stepCount,
        hasBackground: !!components.background,
        hasExamples: components.scenarios.some(s => s.examples && s.examples.length > 0)
      },
      components, // Full component breakdown
      chatInfo: chatInfo
    }
  }];

} catch (error) {
  log(`Error processing Gherkin for chat ${chatInfo.chatId}: ${error.message}\nStack: ${error.stack}`, 'error');
  return [{
    json: {
      success: false,
      error: `An unexpected error occurred while processing Gherkin: ${error.message}`,
      errorType: 'PROCESSING_ERROR',
      stack: error.stack,
      chatInfo: chatInfo
    }
  }];
}
