# Test for n8n copilot instructions
describe('.github/copilot-instructions.md', () => {
  const fs = require('fs');
  const path = require('path');
  
  const instructionsPath = path.join(__dirname, '../.github/copilot-instructions.md');
  
  test('copilot instructions file exists', () => {
    expect(fs.existsSync(instructionsPath)).toBe(true);
  });
  
  test('contains essential n8n development patterns', () => {
    const content = fs.readFileSync(instructionsPath, 'utf8');
    
    // Security guardrail
    expect(content).toContain('Never commit secrets');
    
    // Core commands
    expect(content).toContain('pnpm build');
    expect(content).toContain('pnpm dev');
    
    // Architecture patterns
    expect(content).toContain('@BackendModule');
    expect(content).toContain('@n8n/api-types');
    
    // Testing patterns
    expect(content).toContain('Jest (backend)');
    expect(content).toContain('Vitest (frontend)');
  });
  
  test('no hardcoded secrets or credentials', () => {
    const content = fs.readFileSync(instructionsPath, 'utf8');
    
    // Check for common secret patterns
    expect(content).not.toMatch(/sk-[a-zA-Z0-9]{48}/); // OpenAI API keys
    expect(content).not.toMatch(/ghp_[a-zA-Z0-9]{36}/); // GitHub PAT
    expect(content).not.toMatch(/discord\.com\/api\/webhooks/); // Discord webhooks
  });
});