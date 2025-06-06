// qa-automation/functions/deepseek-prompt.js
// This function is intended to be pasted into an n8n Function node.
// It takes parsed Gherkin data and creates optimized prompts
// for the DeepSeek API to generate Cypress test code. It includes
// best practices, proper structure guidelines, and instructs DeepSeek
// on how to use {{LOCATOR_n}} placeholders for elements that will
// require dynamic locator extraction later.

// Input: items[0].json (from Parse Gherkin node - contains 'gherkin', 'metadata', 'components', 'chatInfo')
// Output: [{ json: { success: boolean, prompt?: string, error?: string, metadata?: object, chatInfo: object } }]

const inputData = items[0].json;

if (!inputData || !inputData.success || !inputData.gherkin || !inputData.metadata || !inputData.components || !inputData.chatInfo) {
  console.error('Error: Invalid input data. Missing gherkin, metadata, components, or chatInfo from previous node.');
  return [{
    json: {
      success: false,
      error: 'Invalid input: Missing or unsuccessful Gherkin parsing data.',
      errorType: 'INVALID_INPUT_DATA',
      chatInfo: inputData?.chatInfo || {}
    }
  }];
}

const { gherkin, metadata, components, chatInfo } = inputData;

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[DeepSeekPrompt] ${prefix}: ${message}`);
}

// Cypress best practices to include in prompts
const CYPRESS_BEST_PRACTICES = `
- Use 'data-testid', 'data-cy', or other specific test attributes for selectors whenever possible.
- For elements without test-specific attributes, use the placeholder format {{LOCATOR_N}} (e.g., {{LOCATOR_1}}, {{LOCATOR_2}}).
- Implement robust waiting strategies: use cy.intercept() for network requests, and .should() assertions for DOM element visibility, state, or content.
- Avoid cy.wait(hardcoded_number) for DOM changes; prefer actionability checks or assertions.
- Use .should('exist') or .should('be.visible') before interacting with elements.
- Group related tests within 'describe' blocks and individual test cases within 'it' blocks.
- Use 'beforeEach' or 'before' hooks for setup tasks like cy.visit() or logging in, if applicable across multiple tests.
- Write clear and descriptive names for 'describe' and 'it' blocks.
- Ensure assertions are specific and meaningful (e.g., .should('contain.text', 'Expected Text') instead of just .should('exist')).
- For complex or repeated sequences of actions, consider creating Cypress Custom Commands (though for this Gherkin-to-code, direct steps are fine).
- If dealing with forms, ensure fields are correctly targeted and filled, and submission is verified.
- If the Gherkin implies checking for multiple elements, use .each() or other appropriate Cypress iteration methods.
`;

// Instructions for using locator placeholders
const LOCATOR_INSTRUCTIONS = `
IMPORTANT FOR LOCATORS:
- For any UI element that needs to be interacted with (clicked, typed into, selected, asserted upon) AND does NOT have an obvious, stable selector like a 'data-testid' or unique ID that you can infer from the Gherkin, YOU MUST use a placeholder in the format {{LOCATOR_N}}.
- Replace N with a sequential number for each unique placeholder (e.g., {{LOCATOR_1}}, {{LOCATOR_2}}, {{LOCATOR_3}}).
- Add a brief JavaScript comment next to the placeholder describing the element it represents, based on the Gherkin step.
  Example: cy.get({{LOCATOR_1}}) /* The main login button */ .click();
           cy.get({{LOCATOR_2}}) /* Username input field */ .type('testuser');
- If a Gherkin step clearly indicates an element by its visible text (e.g., "click the 'Submit' button"), you CAN use cy.contains('button', 'Submit').click(); directly.
- If an element has a clear, unique ID mentioned or implied by the Gherkin (e.g., "the input field with ID 'user-email'"), you CAN use cy.get('#user-email').
- Otherwise, for generic descriptions like "the first input field" or "the confirmation message", USE {{LOCATOR_N}}.
`;

// Test structure template
const TEST_STRUCTURE_TEMPLATE = `
// Cypress Test File
// Feature: {{FEATURE_NAME}}

describe('{{FEATURE_NAME_ESCAPED}}', () => {
  {{GLOBAL_BEFORE_EACH}} // For cy.visit() or global setup

  {{BACKGROUND_SETUP}} // From Gherkin Background

  {{SCENARIOS_CODE}} // Each scenario as an 'it' block
});
`;

// Function to generate the system message/persona for DeepSeek
function generateSystemPersona() {
  return `You are an expert QA Automation Engineer specializing in writing Cypress E2E tests from Gherkin specifications. Your primary goal is to produce clean, robust, and correct Cypress code. Pay close attention to selector strategies and Gherkin step interpretation.`;
}

// Function to generate code for Gherkin steps, adding hints for locators
function generateStepCodeWithHints(gherkinStepsArray) {
  if (!gherkinStepsArray || gherkinStepsArray.length === 0) return '// No steps provided.';

  // Keywords that often involve UI interaction and might need locators
  const interactionKeywords = ['click', 'type', 'select', 'enter', 'fill', 'choose', 'navigate', 'verify', 'see', 'check', 'assert', 'validate', 'ensure', 'confirm', 'hover', 'drag', 'upload', 'submit'];
  let locatorHintCounter = 1; // This is a local counter for hints within this function, not the final {{LOCATOR_N}}

  return gherkinStepsArray.map(step => {
    let stepLine = `    // ${step}`;
    // Check if the step implies interaction that might need a dynamic locator
    if (interactionKeywords.some(keyword => step.toLowerCase().includes(keyword))) {
      // Add a generic hint. The LLM will decide if a {{LOCATOR_N}} is needed.
      // This helps the LLM focus on elements that might need placeholders.
      // We don't assign {{LOCATOR_N}} here directly, but hint that it might be one.
      stepLine += ` /* Consider if a {{LOCATOR_X}} placeholder is needed for elements in this step. */`;
    }
    return stepLine;
  }).join('\n');
}


// Function to generate Cypress 'it' block for a simple scenario
function generateSimpleScenarioCode(scenarioComponent) {
  const scenarioName = (scenarioComponent.name || 'Unnamed Scenario').replace(/^Scenario:\s*/i, '').trim();
  const stepImplementations = generateStepCodeWithHints(scenarioComponent.steps);
  return `
  it('${scenarioName.replace(/'/g, "\\'")}', () => {
${stepImplementations}
  });
`;
}

// Function to generate Cypress code for a scenario outline with examples
function generateScenarioOutlineCode(scenarioComponent) {
  const scenarioOutlineName = (scenarioComponent.name || 'Unnamed Scenario Outline').replace(/^Scenario Outline:\s*/i, '').trim();
  const exampleHeader = scenarioComponent.examples[0].split('|').map(h => h.trim()).filter(h => h);
  const exampleRows = scenarioComponent.examples.slice(1);

  let examplesArrayCode = 'const examples = [\n';
  exampleRows.forEach(row => {
    const values = row.split('|').map(v => v.trim()).filter(v => v);
    if (values.length === exampleHeader.length) {
      let obj = '    { ';
      exampleHeader.forEach((header, index) => {
        obj += `'${header.replace(/'/g, "\\'")}': '${values[index].replace(/'/g, "\\'")}'${index < header.length - 1 ? ', ' : ''}`;
      });
      obj += ' },\n';
      examplesArrayCode += obj;
    }
  });
  examplesArrayCode += '  ];\n\n';

  const stepImplementations = generateStepCodeWithHints(scenarioComponent.steps);

  // Replace <header> placeholders in steps with example[header]
  let templatedSteps = stepImplementations;
  exampleHeader.forEach(header => {
    const regex = new RegExp(`<${header}>`, 'g');
    templatedSteps = templatedSteps.replace(regex, `\${example['${header.replace(/'/g, "\\'")}']}`);
  });

  return `
  describe('${scenarioOutlineName.replace(/'/g, "\\'")}', () => {
    ${examplesArrayCode}
    examples.forEach((example) => {
      it(\`should handle: ${scenarioOutlineName.replace(/'/g, "\\'")} - \${Object.values(example).join(' | ')}\`, () => {
        // Steps to be implemented using 'example' object properties
${templatedSteps}
      });
    });
  });
`;
}

// Function to generate 'beforeEach' for Gherkin Background
function generateBackgroundCode(backgroundComponent) {
  if (!backgroundComponent || !backgroundComponent.steps || backgroundComponent.steps.length === 0) {
    return '// No Background steps defined.';
  }
  const stepImplementations = generateStepCodeWithHints(backgroundComponent.steps);
  return `
  beforeEach('Background', () => {
${stepImplementations}
  });
`;
}

// Main function to generate the full DeepSeek prompt
try {
  log(`Generating DeepSeek prompt for feature: "${metadata.featureName}"`);

  const systemPersona = generateSystemPersona();

  let scenariosCode = '';
  components.scenarios.forEach(scenario => {
    if (scenario.name.toLowerCase().includes('outline') && scenario.examples && scenario.examples.length > 1) {
      scenariosCode += generateScenarioOutlineCode(scenario);
    } else {
      scenariosCode += generateSimpleScenarioCode(scenario);
    }
  });

  const backgroundCode = generateBackgroundCode(components.background);
  
  // Determine a global beforeEach for cy.visit() if not explicitly in background
  // This assumes CYPRESS_BASE_URL is set or a URL is found in Gherkin.
  // The actual URL for cy.visit() will be determined by the 'Process Code' node later.
  // For now, the prompt can suggest a generic visit or rely on LLM to infer from Gherkin.
  let globalBeforeEach = '';
  if (!gherkin.toLowerCase().includes('i am on the page') && !gherkin.toLowerCase().includes('i navigate to')) {
      globalBeforeEach = `
  beforeEach(() => {
    // Assuming the base URL is set in cypress.json or via an environment variable
    // Or, if a specific URL is mentioned in the first 'Given' step, use that.
    // For now, let's prompt for a generic visit or let the LLM decide.
    // Example: cy.visit('/'); // Or infer from first Gherkin step
    // LLM should determine the correct URL or use a base URL.
    cy.visit(Cypress.config('baseUrl') || '/'); /* TODO: LLM to confirm or use specific URL from Gherkin */
  });
`;
  }


  const finalPromptStructure = TEST_STRUCTURE_TEMPLATE
    .replace('{{FEATURE_NAME}}', metadata.featureName || 'Untitled Feature')
    .replace('{{FEATURE_NAME_ESCAPED}}', (metadata.featureName || 'Untitled Feature').replace(/'/g, "\\'"))
    .replace('{{GLOBAL_BEFORE_EACH}}', globalBeforeEach)
    .replace('{{BACKGROUND_SETUP}}', backgroundCode)
    .replace('{{SCENARIOS_CODE}}', scenariosCode);

  const fullPrompt = `
${systemPersona}

You will be provided with a Gherkin specification. Your task is to convert this Gherkin into a complete, executable Cypress test file written in JavaScript.

Follow these instructions carefully:

# GHERKIN SPECIFICATION TO CONVERT:
\`\`\`gherkin
${gherkin}
\`\`\`

# CYPRESS BEST PRACTICES TO FOLLOW:
${CYPRESS_BEST_PRACTICES}

# LOCATOR STRATEGY (VERY IMPORTANT):
${LOCATOR_INSTRUCTIONS}

# REQUIRED TEST STRUCTURE:
Your final output MUST strictly follow this structure. Do NOT add any explanations before or after the code block.
\`\`\`javascript
${finalPromptStructure}
\`\`\`

# FINAL OUTPUT REQUIREMENTS:
- Provide ONLY the JavaScript code for the Cypress test file.
- Do NOT include any markdown formatting (like \`\`\`javascript) around the code.
- The code must be a single, complete file content.
- Ensure all necessary Cypress commands (cy.visit, cy.get, cy.click, cy.type, .should, etc.) are used correctly based on the Gherkin steps.
- If a Gherkin step implies visiting a page, ensure a cy.visit() command is generated, typically in a beforeEach or at the start of a test.
- Implement all Gherkin steps as corresponding Cypress actions and assertions.
- Use the {{LOCATOR_N}} placeholder syntax as described above for elements that will require dynamic lookup.
`;

  log(`Prompt generated successfully. Length: ${fullPrompt.length}`);

  return [{
    json: {
      success: true,
      prompt: fullPrompt,
      metadata: { // Pass along metadata which might be useful for the API call node
        ...metadata,
        promptLength: fullPrompt.length,
        estimatedTokens: Math.ceil(fullPrompt.length / 3.5) // Rough estimate
      },
      chatInfo: chatInfo // Pass chatInfo through
    }
  }];

} catch (error) {
  log(`Error generating DeepSeek prompt: ${error.message}\nStack: ${error.stack}`, 'error');
  return [{
    json: {
      success: false,
      error: `Error generating DeepSeek prompt: ${error.message}`,
      errorType: 'PROMPT_GENERATION_ERROR',
      stack: error.stack,
      chatInfo: chatInfo
    }
  }];
}
