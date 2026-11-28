import { stringMethods } from '../src/native-methods/string.methods';

/**
 * A documented default has to be the value the method actually behaves as if it
 * received. The expression editor renders this metadata as autocomplete help,
 * so a wrong one tells the user to write something that changes their result.
 *
 * `String.lastIndexOf` documented its optional position as defaulting to `0`,
 * but omitting it searches the whole string while passing `0` looks only at the
 * very start: `'canal'.lastIndexOf('a')` is `3`, `'canal'.lastIndexOf('a', 0)`
 * is `-1` (#38460).
 */
describe('string methods: a documented default is what omitting the argument does', () => {
	/** One call per documented optional argument: the receiver and the arguments before it. */
	const CALLS: Array<{ method: string; argName: string; on: string; before: unknown[] }> = [
		{ method: 'indexOf', argName: 'start', on: 'canal', before: ['a'] },
		{ method: 'lastIndexOf', argName: 'end', on: 'canal', before: ['a'] },
		{ method: 'includes', argName: 'start', on: 'canal', before: ['a'] },
		{ method: 'startsWith', argName: 'start', on: 'canal', before: ['c'] },
	];

	test.each(CALLS)('$method: $argName', ({ method, argName, on, before }) => {
		const arg = stringMethods.functions[method]?.doc?.args?.find((a) => a.name === argName);
		expect(arg, `${method} has no documented argument named ${argName}`).toBeDefined();

		const run = (on as unknown as Record<string, (...a: unknown[]) => unknown>)[method];
		const omitted = run.apply(on, before);

		if (arg!.default === undefined) {
			// No numeric default is claimed, so there is nothing that could be wrong.
			// The description carries the behaviour instead.
			expect(arg!.description).toBeTruthy();
			return;
		}

		const documented = Number(arg!.default);
		expect(
			run.apply(on, [...before, documented]),
			`'${on}'.${method}(${before.map((b) => JSON.stringify(b)).join(', ')}) is ${JSON.stringify(omitted)}, ` +
				`but the help says '${argName}' defaults to ${JSON.stringify(arg!.default)}`,
		).toEqual(omitted);
	});

	test('lastIndexOf claims no numeric default, because it has none', () => {
		const arg = stringMethods.functions.lastIndexOf?.doc?.args?.find((a) => a.name === 'end');

		expect(arg?.default).toBeUndefined();
		// The behaviour the user needs is stated instead of a number that is wrong.
		expect(arg?.description).toMatch(/full string/i);
	});
});
