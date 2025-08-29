import {
	extractFromAICalls,
	traverseNodeParameters,
	type FromAIArgument,
	generateZodSchema,
} from '../src/from-ai-parse-utils';

// Note that for historic reasons a lot of testing of this file happens indirectly in `packages/core/test/CreateNodeAsTool.test.ts`

describe('extractFromAICalls', () => {
	test.each<[string, [unknown, unknown, unknown, unknown]]>([
		['$fromAI("a", "b", "string")', ['a', 'b', 'string', undefined]],
		['$fromAI("a", "b", "number", 5)', ['a', 'b', 'number', 5]],
		['$fromAI("a", "`", "number", 5)', ['a', '`', 'number', 5]],
		['$fromAI("a", "\\`", "number", 5)', ['a', '`', 'number', 5]], // this is a bit surprising, but intended
		['$fromAI("a", "\\n", "number", 5)', ['a', 'n', 'number', 5]], // this is a bit surprising, but intended
		['{{ $fromAI("a", "b", "boolean") }}', ['a', 'b', 'boolean', undefined]],
	])('should parse args as expected for %s', (formula, [key, description, type, defaultValue]) => {
		expect(extractFromAICalls(formula)).toEqual([
			{
				key,
				description,
				type,
				defaultValue,
			},
		]);
	});

	test.each([
		['$fromAI("a", "b", "c")'],
		['$fromAI("a", "b", "string"'],
		['$fromAI("a", "b", "string, "d")'],
	])('should throw as expected for %s', (formula) => {
		expect(() => extractFromAICalls(formula)).toThrowError();
	});

	it('supports multiple calls', () => {
		const code = '$fromAI("a", "b", "number"); $fromAI("c", "d", "string")';

		expect(extractFromAICalls(code)).toEqual([
			{
				key: 'a',
				description: 'b',
				type: 'number',
				defaultValue: undefined,
			},
			{
				key: 'c',
				description: 'd',
				type: 'string',
				defaultValue: undefined,
			},
		]);
	});

	it('supports no calls', () => {
		const code = 'fromAI("a", "b", "number")';

		expect(extractFromAICalls(code)).toEqual([]);
	});
});

describe('traverseNodeParameters', () => {
	test.each<[string | string[] | Record<string, string>, [unknown, unknown, unknown, unknown]]>([
		['$fromAI("a", "b", "string")', ['a', 'b', 'string', undefined]],
		['$fromAI("a", "b", "number", 5)', ['a', 'b', 'number', 5]],
		['{{ $fromAI("a", "b", "boolean") }}', ['a', 'b', 'boolean', undefined]],
		[{ a: '{{ $fromAI("a", "b", "boolean") }}', b: 'five' }, ['a', 'b', 'boolean', undefined]],
		[
			['red', '{{ $fromAI("a", "b", "boolean") }}'],
			['a', 'b', 'boolean', undefined],
		],
	])(
		'should parse args as expected for %s',
		(parameters, [key, description, type, defaultValue]) => {
			const out: FromAIArgument[] = [];
			traverseNodeParameters(parameters, out);
			expect(out).toEqual([
				{
					key,
					description,
					type,
					defaultValue,
				},
			]);
		},
	);
});

describe('JSON Type Parsing via generateZodSchema', () => {
	it('should correctly parse a JSON parameter without default', () => {
		// Use an actual $fromAI call string via extractFromAICalls:
		const [arg] = extractFromAICalls(
			'$fromAI("jsonWithoutDefault", "JSON parameter without default", "json")',
		);
		const schema = generateZodSchema(arg);

		// Valid non-empty JSON objects should pass.
		expect(() => schema.parse({ key: 'value' })).not.toThrow();
		expect(schema.parse({ key: 'value' })).toEqual({ key: 'value' });

		// Parsing an empty object should throw a validation error.
		expect(() => schema.parse({})).toThrowError(
			/Value must be a non-empty object or a non-empty array/,
		);
	});

	it('should correctly parse a JSON parameter with a valid default', () => {
		const [arg] = extractFromAICalls(
			'$fromAI("jsonWithValidDefault", "JSON parameter with valid default", "json", "{"key": "defaultValue"}")',
		);
		const schema = generateZodSchema(arg);

		// The default value is now stored as a parsed object.
		expect(schema._def.defaultValue()).toEqual({ key: 'defaultValue' });
	});

	it('should parse a JSON parameter with an empty default', () => {
		const [arg] = extractFromAICalls(
			'$fromAI("jsonEmptyDefault", "JSON parameter with empty default", "json", "{}")',
		);
		const schema = generateZodSchema(arg);

		// The default value is stored as an empty object.
		expect(schema._def.defaultValue()).toEqual({});

		// Parsing an empty object should throw a validation error.
		expect(() => schema.parse({})).toThrowError(
			/Value must be a non-empty object or a non-empty array/,
		);
	});

	it('should use provided JSON value over the default value', () => {
		const [arg] = extractFromAICalls(
			'$fromAI("jsonParamCustom", "JSON parameter with custom default", "json", "{"initial": "value"}")',
		);
		const schema = generateZodSchema(arg);

		// Check that the stored default value parses to the expected object.
		expect(schema._def.defaultValue()).toEqual({ initial: 'value' });

		// When a new valid value is provided, the schema should use it.
		const newValue = { newKey: 'newValue' };
		expect(schema.parse(newValue)).toEqual(newValue);
	});
});
