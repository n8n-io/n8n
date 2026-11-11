import { extractFromAICalls } from '../src/from-ai-parse-utils';

describe('extractFromAICalls: blank default values', () => {
	test('does not coerce an empty number default to 0', () => {
		expect(extractFromAICalls('$fromAI("count", "how many", "number", "")')).toEqual([
			{ key: 'count', description: 'how many', type: 'number', defaultValue: '' },
		]);
	});

	test('does not coerce a whitespace-only number default to 0', () => {
		expect(
			extractFromAICalls('$fromAI("count", "how many", "number", "   ")')[0].defaultValue,
		).toBe('   ');
	});

	test.each<[string, string | number]>([
		['$fromAI("count", "how many", "number", "5")', 5],
		['$fromAI("count", "how many", "number", "0")', 0],
		['$fromAI("count", "how many", "number", "-3")', -3],
		['$fromAI("count", "how many", "number", "2.5")', 2.5],
		['$fromAI("count", "how many", "number", "abc")', 'abc'],
	])('still coerces a non-blank number default for %s', (formula, expected) => {
		expect(extractFromAICalls(formula)[0].defaultValue).toBe(expected);
	});

	test('keeps an empty string default unchanged', () => {
		expect(extractFromAICalls('$fromAI("name", "label", "string", "")')[0].defaultValue).toBe('');
	});

	test('keeps a missing default as undefined', () => {
		expect(
			extractFromAICalls('$fromAI("count", "how many", "number")')[0].defaultValue,
		).toBeUndefined();
	});
});
