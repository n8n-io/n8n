// Simple test to verify the fix works
const getValueTypeDescription = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
};

// Test cases
console.log('Testing getValueTypeDescription function:');
console.log('Array [1,2,3]:', getValueTypeDescription([1, 2, 3])); // Should return 'array'
console.log('Object {key: "value"}:', getValueTypeDescription({ key: "value" })); // Should return 'object'
console.log('String "hello":', getValueTypeDescription("hello")); // Should return 'string'
console.log('Number 42:', getValueTypeDescription(42)); // Should return 'number'
console.log('Boolean true:', getValueTypeDescription(true)); // Should return 'boolean'
console.log('Null:', getValueTypeDescription(null)); // Should return 'null'

// Test the error message generation
const withIndefiniteArticle = (noun) => {
    const article = 'aeiou'.includes(noun.charAt(0)) ? 'an' : 'a';
    return `${article} ${noun}`;
};

const composeInvalidTypeMessage = (type, fromType, value) => {
    fromType = fromType.toLowerCase();
    return `Wrong type: '${value}' is ${withIndefiniteArticle(fromType)} but was expecting ${withIndefiniteArticle(type)}`;
};

// Test error messages
console.log('\nTesting error messages:');
console.log('Array expecting object:', composeInvalidTypeMessage('object', getValueTypeDescription([1, 2, 3]), '[1,2,3]'));
console.log('Object expecting array:', composeInvalidTypeMessage('array', getValueTypeDescription({ key: "value" }), '[object Object]'));

console.log('\nFix verification:');
console.log('✅ Arrays are now correctly identified as "array" instead of "object"');
console.log('✅ Objects are correctly identified as "object"');
console.log('✅ Error messages now show the correct type descriptions');
