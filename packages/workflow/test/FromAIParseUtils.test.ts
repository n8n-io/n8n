import {
	extractFromAICalls,
	type FromAIArgument,
	traverseNodeParameters,
} from '@/FromAIParseUtils';

// Note that for historic reasons a lot of testing of this file happens indirectly in `packages/core/test/CreateNodeAsTool.test.ts`

describe('extractFromAICalls', () => {
	test.each<[string, [unknown, unknown, unknown, unknown]]>([
		['$fromAI("a", "b", "string")', ['a', 'b', 'string', undefined]],
		['$fromAI("a", "b", "number", 5)', ['a', 'b', 'number', 5]],
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
