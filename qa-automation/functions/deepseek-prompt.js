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

// Function to generate a scenario template with hints
function generateScenarioTemplate(scenario, index) {
  if (!scenario || !scenario.name || !scenario.steps) {
    return `  // Missing scenario data for index ${index}`;
  }

  const scenarioName = scenario.name.replace(/^Scenario:?\s*/i, '').trim();
  const escapedScenarioName = scenarioName.replace(/'/g, "\\'");
  const stepsWithHints = generateStepCodeWithHints(scenario.steps);
  
  let scenarioTemplate = `
  it('${escapedScenarioName}', () => {
${stepsWithHints}
    // Add your Cypress code here based on the steps above
  });
`;

  // If this is a scenario outline with examples, add a comment about data-driven testing
  if (scenario.examples && scenario.examples.length > 0) {
    scenarioTemplate += `
  // This is a Scenario Outline with Examples. Consider using cy.wrap() with forEach to iterate through the examples:
  /*
  const examples = ${JSON.stringify(scenario.examples.map(ex => ex.trim()), null, 2)};
  // Parse the examples table and create an array of test data objects
  // Then use forEach to run the test for each example
  */
`;
  }

  return scenarioTemplate;
}

// Main function to generate the complete prompt for DeepSeek
function generateDeepSeekPrompt() {
  try {
    // Extract feature name
    const featureName = components.feature.replace(/^Feature:?\s*/i, '').trim();
    const escapedFeatureName = featureName.replace(/'/g, "\\'");
    
    // Generate scenario templates
    const scenarioTemplates = components.scenarios.map(generateScenarioTemplate).join('\n');
    
    // Generate background setup if present
    let backgroundSetup = '';
    if (components.background && components.background.steps && components.background.steps.length > 0) {
      const backgroundSteps = generateStepCodeWithHints(components.background.steps);
      backgroundSetup = `
  // Background steps to run before each scenario
  beforeEach(() => {
${backgroundSteps}
    // Add your Cypress code here for background steps
  });
`;
    }
    
    // Generate global beforeEach for common setup like cy.visit()
    const globalBeforeEach = `
  beforeEach(() => {
    // Visit the application under test
    cy.visit('/');
    // Add any other common setup steps here
  });
`;
    
    // Assemble the test structure
    const testStructure = TEST_STRUCTURE_TEMPLATE
      .replace('{{FEATURE_NAME}}', featureName)
      .replace('{{FEATURE_NAME_ESCAPED}}', escapedFeatureName)
      .replace('{{GLOBAL_BEFORE_EACH}}', globalBeforeEach)
      .replace('{{BACKGROUND_SETUP}}', backgroundSetup)
      .replace('{{SCENARIOS_CODE}}', scenarioTemplates);
    
    // Create the full prompt for DeepSeek
    const prompt = `${generateSystemPersona()}

# TASK
Convert the following Gherkin specification into a complete, working Cypress E2E test file.

# GHERKIN SPECIFICATION
\`\`\`gherkin
${gherkin}
\`\`\`

# CYPRESS BEST PRACTICES
${CYPRESS_BEST_PRACTICES}

# LOCATOR INSTRUCTIONS
${LOCATOR_INSTRUCTIONS}

# TEST STRUCTURE TEMPLATE
Use this template as a starting point, but adapt it as needed to match the Gherkin requirements:
\`\`\`javascript
${testStructure}
\`\`\`

# ADDITIONAL REQUIREMENTS
- Generate a COMPLETE, WORKING Cypress test file that implements ALL the Gherkin steps.
- The output should be ONLY the JavaScript code for the Cypress test file, nothing else.
- Do NOT include any explanations, comments about your approach, or anything outside the actual code file.
- Make sure to handle any conditional logic or data-driven testing implied by the Gherkin.
- Use {{LOCATOR_N}} placeholders as instructed above for elements that need dynamic locators.
- Add helpful comments next to each {{LOCATOR_N}} placeholder describing what element it represents.
- Ensure the test follows the Given/When/Then structure from the Gherkin.
- Include appropriate assertions for all verification steps.

Now, please generate the complete Cypress test file:`;
    
    return prompt;
  } catch (error) {
    log(`Error generating DeepSeek prompt: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
try {
  const prompt = generateDeepSeekPrompt();
  
  log(`Successfully generated DeepSeek prompt for chat ${chatInfo.chatId}: Feature "${metadata.featureName}" with ${metadata.scenarioCount} scenarios`);
  
  return [{
    json: {
      success: true,
      prompt,
      metadata: {
        ...metadata,
        promptLength: prompt.length,
        promptTokenEstimate: Math.ceil(prompt.length / 4) // Rough estimate
      },
      chatInfo
    }
  }];
} catch (error) {
  log(`Error processing DeepSeek prompt for chat ${chatInfo.chatId}: ${error.message}\nStack: ${error.stack}`, 'error');
  
  return [{
    json: {
      success: false,
      error: `An error occurred while generating the DeepSeek prompt: ${error.message}`,
      errorType: 'PROMPT_GENERATION_ERROR',
      stack: error.stack,
      chatInfo
    }
  }];
}