import type { INode } from '../../src/interfaces';
import {
	matchParameterPathTemplate,
	nodeParametersAreStatic,
	resolveNativeParameterValue,
	resolveParameterPathTemplate,
	valuesAreNativelyResolvable,
} from '../../src/node-parameters/native-parameter-resolution';

const node = (parameters: INode['parameters']): Pick<INode, 'parameters'> => ({ parameters });

describe('matchParameterPathTemplate', () => {
	test.each([
		['={{$parameter["path"]}}', ['path']],
		['={{ $parameter["options"]["responseHeaders"] }}', ['options', 'responseHeaders']],
		["={{$parameter['a']['b']}}", ['a', 'b']],
		['={{$parameter.path}}', ['path']],
		['={{$parameter.options.nested}}', ['options', 'nested']],
		['={{$parameter["list"][0]}}', ['list', '0']],
		['={{$parameter["a"].b["c"]}}', ['a', 'b', 'c']],
		['={{$parameter["with space"]}}', ['with space']],
		['={{$parameter["dot.in.key"]}}', ['dot.in.key']],
	])('matches %s', (template, path) => {
		expect(matchParameterPathTemplate(template)).toEqual({ path, hasFallback: false });
	});

	test.each([
		['={{$parameter["httpMethod"] || "GET"}}', ['httpMethod'], 'GET'],
		["={{$parameter['x'] || 'fallback'}}", ['x'], 'fallback'],
		['={{ $parameter["x"] || 200 }}', ['x'], 200],
		['={{ $parameter["x"] || -1.5 }}', ['x'], -1.5],
		['={{ $parameter["x"] || true }}', ['x'], true],
		['={{ $parameter["x"] || false }}', ['x'], false],
		['={{ $parameter["x"] || null }}', ['x'], null],
	])('matches %s with a fallback', (template, path, fallback) => {
		expect(matchParameterPathTemplate(template)).toEqual({
			path,
			hasFallback: true,
			fallback,
		});
	});

	test.each([
		// Interpolation concatenates, so the engine's result differs from a plain read
		['=prefix-{{$parameter["path"]}}'],
		['={{$parameter["a"]}}-{{$parameter["b"]}}'],
		// Not an expression at all
		['{{$parameter["path"]}}'],
		['plain'],
		// Reads more than the parameter bag
		['={{$json.body.id}}'],
		['={{$parameter["path"] + $json.id}}'],
		['={{$parameter}}'],
		// Sibling lookups and dynamic keys are proxy features we do not reimplement
		['={{$parameter["&value"]}}'],
		['={{$parameter[someKey]}}'],
		// Function bodies need a `resolve` entry instead
		['={{(function (p) { return p.a; })($parameter)}}'],
		// Fallbacks other than a literal are not reimplemented
		['={{$parameter["a"] || $parameter["b"]}}'],
		['={{$parameter["a"] ?? "x"}}'],
		// Escapes and line breaks in a quoted part: the engine unescapes them,
		// `parseLiteral` would return them raw
		['={{$parameter["a"] || "x\\ny"}}'],
		['={{$parameter["a"] || \'x\\\\\'}}'],
		['={{$parameter["a\\\\b"]}}'],
		['={{$parameter["a\nb"]}}'],
	])('does not match %s', (template) => {
		expect(matchParameterPathTemplate(template)).toBeNull();
	});

	it('does not match non-string values', () => {
		expect(matchParameterPathTemplate(undefined)).toBeNull();
		expect(matchParameterPathTemplate(true)).toBeNull();
	});
});

describe('resolveParameterPathTemplate', () => {
	const parameters = {
		path: 'webhook-path',
		httpMethod: '',
		options: { responseHeaders: { entries: [{ name: 'x', value: 'y' }] }, zero: 0 },
		list: ['first'],
	};

	const resolve = (template: string) =>
		resolveParameterPathTemplate(matchParameterPathTemplate(template)!, parameters);

	it('reads nested values', () => {
		expect(resolve('={{$parameter["path"]}}')).toBe('webhook-path');
		expect(resolve('={{$parameter["options"]["responseHeaders"]}}')).toEqual({
			entries: [{ name: 'x', value: 'y' }],
		});
		expect(resolve('={{$parameter["list"][0]}}')).toBe('first');
	});

	it('returns undefined for a missing key, and for walking into a nullish value', () => {
		expect(resolve('={{$parameter["missing"]}}')).toBeUndefined();
		expect(resolve('={{$parameter["missing"]["deeper"]}}')).toBeUndefined();
	});

	it('applies a fallback with JS truthiness, matching the template', () => {
		// Empty string and 0 are falsy, so `||` takes the fallback
		expect(resolve('={{$parameter["httpMethod"] || "GET"}}')).toBe('GET');
		expect(resolve('={{$parameter["options"]["zero"] || 42}}')).toBe(42);
		expect(resolve('={{$parameter["path"] || "GET"}}')).toBe('webhook-path');
	});
});

describe('nodeParametersAreStatic', () => {
	it('accepts plain values at any depth', () => {
		expect(
			nodeParametersAreStatic(
				node({
					path: 'p',
					options: { nested: { deep: 1 }, list: ['a', 2, true, null] },
				}),
			),
		).toBe(true);
	});

	it('rejects an expression, wherever it is', () => {
		expect(nodeParametersAreStatic(node({ path: '={{ $json.id }}' }))).toBe(false);
		expect(nodeParametersAreStatic(node({ options: { onlyRunIf: '={{ true }}' } }))).toBe(false);
		expect(nodeParametersAreStatic(node({ list: ['plain', '={{ 1 }}'] }))).toBe(false);
		expect(nodeParametersAreStatic(node({ deep: { list: [{ x: '=1' }] } }))).toBe(false);
	});

	it('rejects resource-locator values, which the $parameter proxy unwraps', () => {
		expect(nodeParametersAreStatic(node({ doc: { __rl: true, mode: 'id', value: 'abc' } }))).toBe(
			false,
		);
	});
});

describe('resolveNativeParameterValue', () => {
	it('resolves a matching template on a static node', () => {
		expect(resolveNativeParameterValue(node({ path: 'p' }), '={{$parameter["path"]}}')).toEqual({
			resolved: true,
			value: 'p',
		});
	});

	it('declines when the node has any expression parameter', () => {
		expect(
			resolveNativeParameterValue(
				node({ path: 'p', other: '={{ $json.id }}' }),
				'={{$parameter["path"]}}',
			),
		).toEqual({ resolved: false });
	});

	it('declines when the template is not a plain parameter read', () => {
		expect(
			resolveNativeParameterValue(node({ path: 'p' }), '={{ $parameter["path"].toUpperCase() }}'),
		).toEqual({ resolved: false });
	});
});

describe('resolveNativeParameterValue with a declared resolver', () => {
	const resolver = (parameters: INode['parameters']) => `${parameters.a}-${parameters.b}`;

	it('uses the resolver in place of a template it cannot read', () => {
		expect(
			resolveNativeParameterValue(
				node({ a: 1, b: 2 }),
				'={{(function () {})($parameter)}}',
				resolver,
			),
		).toEqual({ resolved: true, value: '1-2' });
	});

	it('declines when the node has any expression parameter', () => {
		expect(
			resolveNativeParameterValue(node({ a: 1, b: '={{ $json.b }}' }), 'anything', resolver),
		).toEqual({ resolved: false });
	});
});

describe('valuesAreNativelyResolvable', () => {
	it('accepts values that are not expressions', () => {
		expect(valuesAreNativelyResolvable({ name: 'default', isFullPath: true })).toBe(true);
	});

	it('accepts templates the matcher reads', () => {
		expect(valuesAreNativelyResolvable({ path: '={{$parameter["path"]}}' })).toBe(true);
	});

	it('rejects a template the matcher cannot read', () => {
		expect(valuesAreNativelyResolvable({ path: '={{ $parameter.path.trim() }}' })).toBe(false);
	});

	it('accepts a template the description declares a resolver for', () => {
		const values = { responseCode: '={{(function () {})($parameter)}}' };
		expect(valuesAreNativelyResolvable(values)).toBe(false);
		expect(valuesAreNativelyResolvable(values, { responseCode: () => 200 })).toBe(true);
	});

	it('rejects an expression nested inside an object or array', () => {
		expect(
			valuesAreNativelyResolvable({ headers: { entries: [{ value: '={{ $json.x }}' }] } }),
		).toBe(false);
	});

	it('ignores the resolver functions themselves', () => {
		expect(valuesAreNativelyResolvable({ resolve: { responseCode: () => 200 } })).toBe(true);
	});
});
