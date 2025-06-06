// qa-automation/functions/parse-gherkin.js
// This function is intended to be pasted into an n8n Function node.
// It parses Gherkin syntax from Telegram messages, validates the format,
// extracts test components, and prepares data for the DeepSeek API conversion.

// Input: items[0].json (from Telegram Trigger node - contains 'message', 'chat', 'from')
// Output: [{ json: { success: boolean, gherkin?: string, metadata?: object, components?: object, error?: string, chatInfo: object } }]

const inputData = items[0].json;

if (!inputData || !inputData.message || !inputData.chat || !inputData.from) {
  console.error('Error: Invalid input data. Missing message, chat, or from.');
  return [{
    json: {
      success: false,
      error: 'Invalid input: Missing Telegram message data.',
      errorType: 'INVALID_INPUT_DATA',
      chatInfo: {}
    }
  }];
}

const { message, chat, from } = inputData;

if (!message.text || message.text.trim() === '') {
  console.error('Error: Empty message text.');
  return [{
    json: {
      success: false,
      error: 'Invalid input: Empty message text.',
      errorType: 'EMPTY_MESSAGE',
      chatInfo: { chatId: chat.id, userId: from.id, username: from.username }
    }
  }];
}

// Store chat information for later use
const chatInfo = {
  chatId: chat.id,
  chatTitle: chat.title || `${from.first_name} ${from.last_name || ''}`.trim(),
  userId: from.id,
  username: from.username,
  firstName: from.first_name,
  lastName: from.last_name,
  messageId: message.message_id,
  date: new Date(message.date * 1000).toISOString()
};

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[ParseGherkin] ${prefix}: ${message}`);
}

// Function to parse Gherkin syntax from message text
function parseGherkin(text) {
  try {
    // Normalize line endings and trim
    const normalizedText = text.replace(/\r\n/g, '\n').trim();
    
    // Check if the message contains Gherkin syntax
    if (!normalizedText.match(/Feature:|Scenario:|Given |When |Then /i)) {
      return {
        success: false,
        error: 'Message does not contain valid Gherkin syntax.',
        errorType: 'INVALID_GHERKIN'
      };
    }
    
    // Extract Feature
    const featureMatch = normalizedText.match(/Feature:([^\n]+)/i);
    if (!featureMatch) {
      return {
        success: false,
        error: 'Missing "Feature:" section in Gherkin.',
        errorType: 'MISSING_FEATURE'
      };
    }
    const featureName = featureMatch[1].trim();
    
    // Extract Scenarios
    const scenarioBlocks = normalizedText.split(/\s*Scenario:(?!.*Scenario:.*Scenario:)/i).slice(1);
    if (scenarioBlocks.length === 0) {
      return {
        success: false,
        error: 'Missing "Scenario:" section in Gherkin.',
        errorType: 'MISSING_SCENARIO'
      };
    }
    
    // Parse each scenario
    const scenarios = [];
    const scenarioNames = [];
    
    for (const block of scenarioBlocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      
      const scenarioName = lines[0].trim();
      scenarioNames.push(scenarioName);
      
      const steps = [];
      let examples = [];
      let inExamples = false;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.toLowerCase().startsWith('examples:')) {
          inExamples = true;
          continue;
        }
        
        if (inExamples) {
          examples.push(line);
        } else if (line.match(/^(Given|When|Then|And|But)\s+/i)) {
          steps.push(line);
        }
      }
      
      scenarios.push({
        name: `Scenario: ${scenarioName}`,
        steps,
        examples: examples.length > 0 ? examples : undefined
      });
    }
    
    // Extract Background if present
    let background = null;
    const backgroundMatch = normalizedText.match(/Background:[\s\S]*?(?=Scenario:|$)/i);
    if (backgroundMatch) {
      const backgroundText = backgroundMatch[0].trim();
      const lines = backgroundText.split('\n').slice(1).map(line => line.trim()).filter(Boolean);
      const steps = lines.filter(line => line.match(/^(Given|When|Then|And|But)\s+/i));
      
      if (steps.length > 0) {
        background = {
          steps
        };
      }
    }
    
    // Assemble the components object
    const components = {
      feature: `Feature: ${featureName}`,
      scenarios,
      background
    };
    
    // Create metadata
    const metadata = {
      featureName,
      scenarioCount: scenarios.length,
      scenarioNames,
      hasBackground: !!background,
      stepCount: scenarios.reduce((count, scenario) => count + scenario.steps.length, 0) + (background ? background.steps.length : 0)
    };
    
    return {
      success: true,
      gherkin: normalizedText,
      components,
      metadata
    };
  } catch (error) {
    log(`Error parsing Gherkin: ${error.message}`, 'error');
    return {
      success: false,
      error: `Failed to parse Gherkin: ${error.message}`,
      errorType: 'PARSING_ERROR'
    };
  }
}

// Main execution
try {
  log(`Processing message from ${chatInfo.username || chatInfo.userId} in chat ${chatInfo.chatId}`);
  
  const result = parseGherkin(message.text);
  
  if (result.success) {
    log(`Successfully parsed Gherkin: Feature "${result.metadata.featureName}" with ${result.metadata.scenarioCount} scenarios`);
    
    return [{
      json: {
        success: true,
        gherkin: result.gherkin,
        components: result.components,
        metadata: result.metadata,
        chatInfo
      }
    }];
  } else {
    log(`Failed to parse Gherkin: ${result.error}`, 'error');
    
    return [{
      json: {
        success: false,
        error: result.error,
        errorType: result.errorType,
        chatInfo
      }
    }];
  }
} catch (error) {
  log(`Error processing message: ${error.message}\nStack: ${error.stack}`, 'error');
  
  return [{
    json: {
      success: false,
      error: `An error occurred while processing the message: ${error.message}`,
      errorType: 'PROCESSING_ERROR',
      stack: error.stack,
      chatInfo
    }
  }];
}