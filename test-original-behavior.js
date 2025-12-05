// Test script to reproduce the original issue in fresh clone
const { jsonParse } = require('./packages/workflow/dist/cjs/utils');

console.log('=== Testing Original Behavior (Before Fix) ===\n');

// Test the exact logic from the original HttpRequest V3 node
function testOriginalBehavior(jsonBodyParameter, testName) {
  console.log(`\n${testName}:`);
  console.log(`Input: ${JSON.stringify(jsonBodyParameter)} (type: ${typeof jsonBodyParameter})`);
  
  if (typeof jsonBodyParameter !== 'object' && jsonBodyParameter !== null) {
    try {
      // This is the original validation logic
      JSON.parse(jsonBodyParameter);
      console.log('✅ JSON.parse validation passed');
      
      // Use jsonParse for actual processing
      const result = jsonParse(jsonBodyParameter);
      console.log('✅ jsonParse succeeded:', result);
      
    } catch (error) {
      console.log('❌ JSON validation failed');
      console.log('🔍 Original error message would be: "JSON parameter needs to be valid JSON"');
      console.log(`   Actual parse error: ${error.message}`);
    }
  } else {
    console.log('✅ Already an object, no validation needed');
  }
}

// Test cases that should show the original unhelpful error
testOriginalBehavior('{"message": "Hello World"', 'Test 1: Invalid JSON - Missing closing brace');
testOriginalBehavior('{"message": "Hello World"}}', 'Test 2: Invalid JSON - Extra closing brace');
testOriginalBehavior('not json at all', 'Test 3: Non-JSON string');
testOriginalBehavior('', 'Test 4: Empty string');

// Test cases that should work
testOriginalBehavior('{"message": "Hello World"}', 'Test 5: Valid JSON string');
testOriginalBehavior('{"message": "{{ $json.payload }}"}', 'Test 6: Valid JSON with expression');
testOriginalBehavior({ message: 'Hello World' }, 'Test 7: Already parsed object');

console.log('\n=== Summary ===');
console.log('❌ Original behavior: Vague error "JSON parameter needs to be valid JSON"');
console.log('❌ No guidance on how to fix the issue');
console.log('❌ No specific context about what went wrong');
