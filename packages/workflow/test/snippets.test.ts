import { runSnippetTests } from '../src/common/snippet-tests';
import {
	bindSnippets,
	SNIPPETS_PROXY_KEY,
	getTransformedSnippets,
	hasSnippets,
	validateSnippetSource,
} from '../src/common/snippets';
import { extend, extendOptional } from '../src/extensions';
import type { IDataObject } from '../src/interfaces';

const SOURCES = {
	global: {
		double: '(n) => n * 2',
		TAX: '0.19',
		fromJson: '() => $json.x + 1',
		usesOther: '(n) => $snippets.double(n) + $snippets.TAX',
		titled: '(s) => s.toTitleCase()',
		multi: '(a, b) => { if (a > b) { return a - b } return b - a }',
		broken: '(x =>',
	},
	project: {
		greet: "(name) => 'hi ' + name.toUpperCase()",
	},
};

const bind = (data: IDataObject = {}) => {
	Object.assign(data, { extend, extendOptional, [SNIPPETS_PROXY_KEY]: SOURCES });
	bindSnippets(data);
	return data as IDataObject & {
		$snippets: Record<string, unknown>;
		$project: Record<string, unknown>;
	};
};

describe('bindSnippets', () => {
	it('exposes callable snippets and constants', () => {
		const data = bind({ $json: { x: 2 } });
		expect((data.$snippets.double as (n: number) => number)(21)).toBe(42);
		expect(data.$snippets.TAX).toBe(0.19);
		expect((data.$snippets.multi as (a: number, b: number) => number)(3, 10)).toBe(7);
	});

	it('late-binds snippets to the caller context', () => {
		const data = bind({ $json: { x: 2 } });
		expect((data.$snippets.fromJson as () => number)()).toBe(3);
	});

	it('supports cross-snippet calls and $project scope', () => {
		const data = bind();
		expect((data.$snippets.usesOther as (n: number) => number)(2)).toBe(4.19);
		expect((data.$project.greet as (n: string) => string)('bob')).toBe('hi BOB');
	});

	it('supports expression extension methods', () => {
		const data = bind();
		expect((data.$snippets.titled as (s: string) => string)('hello world')).toBe('Hello World');
	});

	it('fails a broken snippet only on access and freezes namespaces', () => {
		const data = bind();
		expect(() => data.$snippets.broken).toThrow('failed to compile');
		expect(() => {
			'use strict';
			data.$snippets.double = 1;
		}).toThrow();
	});

	it('does nothing without sources', () => {
		const data: IDataObject = {};
		bindSnippets(data);
		expect(data.$snippets).toBeUndefined();
	});
});

describe('validateSnippetSource', () => {
	it('accepts single expressions with multi-statement bodies', () => {
		expect(() =>
			validateSnippetSource('(a, b) => { if (a) { return a + b } return 0 }'),
		).not.toThrow();
	});

	it.each([
		['function declaration', 'function f() {}'],
		['variable declaration', 'const x = 1'],
		['multiple statements', '1; 2'],
		['constructor access', '(x) => x.constructor'],
		['proto access', '(x) => x.__proto__'],
	])('rejects %s', (_name, source) => {
		expect(() => validateSnippetSource(source)).toThrow();
	});
});

describe('getTransformedSnippets', () => {
	it('transforms every valid snippet and replaces broken ones with throwing programs', () => {
		const transformed = getTransformedSnippets(SOURCES);
		expect(Object.keys(transformed.global).sort()).toEqual(
			['TAX', 'broken', 'double', 'fromJson', 'multi', 'titled', 'usesOther'].sort(),
		);
		expect(transformed.global.double).toContain('return');
		expect(transformed.global.broken).toContain('failed to compile');
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		expect(() => new Function('E', transformed.global.broken + ';').call({})).toThrow(
			'failed to compile',
		);
	});
});

describe('runSnippetTests', () => {
	const sources = {
		global: { double: '(n) => n * 2', TAX: '0.19' },
		project: { greet: "(name) => 'hi ' + name" },
	};

	it('deep-compares code against the expected expression', () => {
		const results = runSnippetTests(sources, [
			{ name: 'doubles', code: '$snippets.double(2)', expected: '4' },
			{ name: 'objects', code: '({ a: [1, 2] })', expected: '({ a: [1, 2] })' },
			{ name: 'expressions on both sides', code: '$snippets.double(3)', expected: '$min(6, 10)' },
			{ name: 'failing', code: '$snippets.double(2)', expected: '5' },
		]);

		expect(results).toEqual([
			{ name: 'doubles', passed: true, value: 4, expected: 4 },
			{ name: 'objects', passed: true, value: { a: [1, 2] }, expected: { a: [1, 2] } },
			{ name: 'expressions on both sides', passed: true, value: 6, expected: 6 },
			{ name: 'failing', passed: false, value: 4, expected: 5 },
		]);
	});

	it('falls back to a truthy check without an expected expression', () => {
		const results = runSnippetTests(sources, [
			{ name: 'truthy', code: "typeof $snippets.TAX === 'number'" },
			{ name: 'falsy', code: '$snippets.double(2) === 5' },
			{ name: 'throws', code: '$snippets.missing()' },
			{ name: 'invalid syntax', code: '(x =>' },
		]);

		expect(results).toEqual([
			{ name: 'truthy', passed: true, value: true },
			{ name: 'falsy', passed: false, value: false },
			{ name: 'throws', passed: false, error: expect.stringContaining('') },
			{ name: 'invalid syntax', passed: false, error: expect.stringContaining('') },
		]);
	});

	it('reports an error when the expected expression throws', () => {
		const [result] = runSnippetTests(sources, [
			{ name: 'bad expected', code: '1', expected: '$snippets.missing()' },
		]);
		expect(result.passed).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('uses the test expressions as name when none is given', () => {
		const results = runSnippetTests(sources, [
			{ code: '$snippets.double(2)', expected: '4' },
			{ name: '  ', code: '$snippets.double(1) === 2' },
		]);
		expect(results.map((result) => result.name)).toEqual([
			'$snippets.double(2) === 4',
			'$snippets.double(1) === 2',
		]);
	});
});

describe('hasSnippets', () => {
	it('detects empty and non-empty sources', () => {
		expect(hasSnippets(undefined)).toBe(false);
		expect(hasSnippets({ global: {}, project: {} })).toBe(false);
		expect(hasSnippets({ global: { a: '1' }, project: {} })).toBe(true);
	});
});
