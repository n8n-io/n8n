/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */
import { FROM_AI_AUTO_GENERATED_MARKER } from '../src/constants';
import type { INodeProperties } from '../src/interfaces';
import {
	extractFromAICalls,
	traverseNodeParameters,
	type FromAIArgument,
	generateZodSchema,
	isFromAIOnlyExpression,
	findDisallowedChatToolExpressions,
	collectExpressionDefaults,
} from '../src/from-ai-parse-utils';

// Note that for historic reasons a lot of testing of this file happens indirectly in `packages/core/test/CreateNodeAsTool.test.ts`

describe('extractFromAICalls', () => {
	test.each<[string, [unknown, unknown, unknown, unknown]]>([
		['$fromAI("a", "b", "string")', ['a', 'b', 'string', undefined]],
		['$fromAI("a", "b", "number", 5)', ['a', 'b', 'number', 5]],
		['$fromAI("a", "b", "number", "5")', ['a', 'b', 'number', 5]],
		['$fromAI("a", "`", "number", 5)', ['a', '`', 'number', 5]],
		['$fromAI("a", "\\`", "number", 5)', ['a', '`', 'number', 5]], // this is a bit surprising, but intended
		['$fromAI("a", "\\n", "number", 5)', ['a', 'n', 'number', 5]], // this is a bit surprising, but intended
		['{{ $fromAI("a", "b", "boolean") }}', ['a', 'b', 'boolean', undefined]],
		['{{ $fromAI("a", "b", "boolean", "true") }}', ['a', 'b', 'boolean', true]],
		['{{ $fromAI("a", "b", "boolean", "false") }}', ['a', 'b', 'boolean', false]],
		['{{ $fromAI("a", "b", "boolean", true) }}', ['a', 'b', 'boolean', true]],
		['{{ $fromAI("a", "b", "string", "") }}', ['a', 'b', 'string', '']],
		['{{ $fromAI("a", "b", "string", "null") }}', ['a', 'b', 'string', 'null']],
		['{{ $fromAI("a", "b", "string", "5") }}', ['a', 'b', 'string', '5']],
		['{{ $fromAI("a", "b", "string", "true") }}', ['a', 'b', 'string', 'true']],
		['{{ $fromAI("a", "b", "string", "{}") }}', ['a', 'b', 'string', '{}']],
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

describe('isFromAIOnlyExpression', () => {
	it.each([
		'={{ $fromAI("key", "desc", "string") }}',
		'={{ $fromAI("key") }}',
		'={{ $fromAI("key", "a description with (parens)") }}',
		`={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI("key", "desc") }}`,
		'={{ $fromAI("key", "desc", "number", 5) }}',
		'={{ $fromAI( "key" ) }}',
		'={{ $fromAI("key", ``, "boolean") }}',
		'={{ $fromAI("key", `plain backtick desc`) }}',
	])('should accept valid $fromAI-only expression: %s', (expr) => {
		expect(isFromAIOnlyExpression(expr)).toBe(true);
	});

	it.each([
		'={{ $fromAI("key") + $env.SECRET }}',
		'={{ $fromAI("key"); fetch("x") }}',
		'={{ $fromAI("key") + " extra" }}',
		'={{ $json.field }}',
		'={{ $env.SECRET }}',
		'={{ 1 + 2 }}',
		'={{ $fromAI("key") && true }}',
		'={{ $workflow.name }}',
		'={{ $fromAI(evil()) }}',
		'={{ $fromAI(require("child_process").exec("rm -rf /")) }}',
		'={{ $fromAI("key", getSecret()) }}',
		'={{ $fromAI(`${evil()}`) }}',
		'={{ $fromAI(`prefix${evil()}suffix`) }}',
		'={{ $fromAI("key", `${$env.SECRET}`) }}',
		'={{ $fromAI($env.SECRET) }}',
		'={{ $fromAI("key", "desc" + $env.SECRET) }}',
		'={{ $fromAI("key", true ? $env.SECRET : "x") }}',
		'={{ $fromAI(eval`code`) }}',
	])('should reject expression with extra content: %s', (expr) => {
		expect(isFromAIOnlyExpression(expr)).toBe(false);
	});

	it('should reject plain strings', () => {
		expect(isFromAIOnlyExpression('just a string')).toBe(false);
	});

	it('should reject empty expression', () => {
		expect(isFromAIOnlyExpression('={{ }}')).toBe(false);
	});

	it('should handle unbalanced parentheses gracefully', () => {
		expect(isFromAIOnlyExpression('={{ $fromAI("key" }}')).toBe(false);
	});
});

describe('findDisallowedChatToolExpressions', () => {
	it('should return empty array for plain values', () => {
		expect(findDisallowedChatToolExpressions({ url: 'https://example.com', count: 5 })).toEqual([]);
	});

	it('should return empty array for $fromAI-only expressions', () => {
		expect(
			findDisallowedChatToolExpressions({
				url: '={{ $fromAI("url", "The URL") }}',
				body: '={{ $fromAI("body", "Request body") }}',
			}),
		).toEqual([]);
	});

	it('should detect disallowed expressions in flat objects', () => {
		const result = findDisallowedChatToolExpressions({
			url: '={{ $env.API_URL }}',
			name: 'valid',
		});
		expect(result).toEqual([{ path: 'url', value: '={{ $env.API_URL }}' }]);
	});

	it('should detect disallowed expressions in nested objects', () => {
		const result = findDisallowedChatToolExpressions({
			options: {
				headers: {
					value: '={{ $json.token }}',
				},
			},
		});
		expect(result).toEqual([{ path: 'options.headers.value', value: '={{ $json.token }}' }]);
	});

	it('should detect disallowed expressions in arrays', () => {
		const result = findDisallowedChatToolExpressions({
			items: ['valid', '={{ $env.SECRET }}'],
		});
		expect(result).toEqual([{ path: 'items[1]', value: '={{ $env.SECRET }}' }]);
	});

	it('should return multiple violations', () => {
		const result = findDisallowedChatToolExpressions({
			a: '={{ $env.A }}',
			b: '={{ $env.B }}',
			c: '={{ $fromAI("key") }}',
		});
		expect(result).toHaveLength(2);
		expect(result.map((v) => v.path)).toEqual(['a', 'b']);
	});

	it('should handle mixed valid and invalid in nested arrays of objects', () => {
		const result = findDisallowedChatToolExpressions({
			headers: [
				{ name: 'Auth', value: '={{ $env.TOKEN }}' },
				{ name: 'Content-Type', value: 'application/json' },
			],
		});
		expect(result).toEqual([{ path: 'headers[0].value', value: '={{ $env.TOKEN }}' }]);
	});

	it('should skip expressions present in allowedExpressions', () => {
		const allowed = new Set(['={{ $now }}', "={{ $now.plus(1, 'hour') }}"]);
		const result = findDisallowedChatToolExpressions(
			{
				startTime: '={{ $now }}',
				endTime: "={{ $now.plus(1, 'hour') }}",
				url: '={{ $fromAI("url", "The URL") }}',
			},
			'',
			allowed,
		);
		expect(result).toEqual([]);
	});

	it('should still flag non-allowed expressions when allowedExpressions is provided', () => {
		const allowed = new Set(['={{ $now }}']);
		const result = findDisallowedChatToolExpressions(
			{
				startTime: '={{ $now }}',
				secret: '={{ $env.SECRET }}',
			},
			'',
			allowed,
		);
		expect(result).toEqual([{ path: 'secret', value: '={{ $env.SECRET }}' }]);
	});

	it('should still allow $fromAI expressions alongside allowedExpressions', () => {
		const allowed = new Set(['={{ $now }}']);
		const result = findDisallowedChatToolExpressions(
			{
				startTime: '={{ $now }}',
				name: '={{ $fromAI("name", "The name") }}',
			},
			'',
			allowed,
		);
		expect(result).toEqual([]);
	});
});

describe('collectExpressionDefaults', () => {
	it('should collect expression defaults from flat properties', () => {
		const properties: INodeProperties[] = [
			{ displayName: 'Start', name: 'start', type: 'string', default: '={{ $now }}' },
			{ displayName: 'Name', name: 'name', type: 'string', default: 'plain' },
			{
				displayName: 'End',
				name: 'end',
				type: 'string',
				default: "={{ $now.plus(1, 'hour') }}",
			},
		];
		const result = collectExpressionDefaults(properties);
		expect(result).toEqual(new Set(['={{ $now }}', "={{ $now.plus(1, 'hour') }}"]));
	});

	it('should collect expression defaults from nested options (INodePropertyCollection)', () => {
		const properties: INodeProperties[] = [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Time Range',
						name: 'timeRange',
						values: [
							{
								displayName: 'Start',
								name: 'start',
								type: 'string',
								default: '={{ $now }}',
							},
						],
					},
				],
			},
		];
		const result = collectExpressionDefaults(properties);
		expect(result).toEqual(new Set(['={{ $now }}']));
	});

	it('should ignore non-expression defaults', () => {
		const properties: INodeProperties[] = [
			{ displayName: 'Name', name: 'name', type: 'string', default: 'hello' },
			{ displayName: 'Count', name: 'count', type: 'number', default: 5 },
			{ displayName: 'Active', name: 'active', type: 'boolean', default: true },
		];
		const result = collectExpressionDefaults(properties);
		expect(result).toEqual(new Set());
	});
});
