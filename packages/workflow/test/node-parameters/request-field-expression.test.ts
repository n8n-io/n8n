import type { IDataObject } from '../../src/interfaces';
import {
	matchSimpleRequestFieldPath,
	resolveRequestFieldPath,
} from '../../src/node-parameters/request-field-expression';

describe('matchSimpleRequestFieldPath', () => {
	test.each<[string, string]>([
		// dot notation
		['={{ $json.body.campaign_id }}', '.body.campaign_id'],
		['={{$json.body.x}}', '.body.x'],
		['={{ $json.query.a.b.c.d.e }}', '.query.a.b.c.d.e'],
		['={{ $json.body._private }}', '.body._private'],
		['={{ $json.body.$dollar }}', '.body.$dollar'],
		['={{ $json.body.x1 }}', '.body.x1'],
		// bracket notation
		["={{ $json.headers['x-api-key'] }}", ".headers['x-api-key']"],
		['={{ $json.headers["x-api-key"] }}', '.headers["x-api-key"]'],
		["={{ $json['body']['x'] }}", "['body']['x']"],
		["={{ $json.body['content type'] }}", ".body['content type']"],
		["={{ $json.body[''] }}", ".body['']"],
		['={{ $json.body[0] }}', '.body[0]'],
		['={{ $json.body.items[0] }}', '.body.items[0]'],
		['={{ $json.body.items[12].id }}', '.body.items[12].id'],
		["={{ $json.body[ 'spaced' ] }}", ".body[ 'spaced' ]"],
		// mixed quoting: double quotes inside single-quoted key and vice versa
		['={{ $json.body[\'say "hi"\'] }}', '.body[\'say "hi"\']'],
		["={{ $json.body[\"it's\"] }}", '.body["it\'s"]'],
		// whitespace tolerance around the template
		['=  {{ $json.body.x }}  ', '.body.x'],
		['={{$json.body.x }}', '.body.x'],
		['={{ $json.body.x}}', '.body.x'],
		['=\n{{ $json.body.x }}\n', '.body.x'],
	])('should match %j and return the path %j', (value, expected) => {
		expect(matchSimpleRequestFieldPath(value)).toBe(expected);
	});

	test.each<[string]>([
		// not an expression at all
		[''],
		['='],
		['hello'],
		['{{ $json.body.x }}'],
		// bare $json without a path
		['={{ $json }}'],
		['={{ $json. }}'],
		// anything computed
		['={{ $json.body.x.toUpperCase() }}'],
		["={{ $json.body.x === 'y' }}"],
		['={{ $json.body.a + $json.body.b }}'],
		['={{ !$json.body.flag }}'],
		// other context variables
		['={{ $now }}'],
		['={{ $env.FOO }}'],
		['={{ $node.body.x }}'],
		['={{ $jsonx.body.x }}'],
		['={{ $JSON.body.x }}'],
		// extra content around the template
		['={{ $json.body.x }} suffix'],
		['prefix {{ $json.body.x }}'],
		['={{ $json.a }}{{ $json.b }}'],
		// malformed paths
		['={{ $json..x }}'],
		['={{ $json.body.x. }}'],
		['={{ $json.body.1x }}'],
		['={{ $json.body.café }}'],
		['={{ $json.body[x] }}'],
		['={{ $json.body[-1] }}'],
		['={{ $json.body[1.5] }}'],
		["={{ $json.body['unclosed] }}"],
		['={{ $json.body[\'mixed"] }}'],
		// optional chaining is not a plain reference
		['={{ $json.body?.x }}'],
	])('should not match %j', (value) => {
		expect(matchSimpleRequestFieldPath(value)).toBeNull();
	});
});

describe('resolveRequestFieldPath', () => {
	const source: IDataObject = {
		body: {
			contact: { id: 42 },
			items: ['first', 'second'],
			flag: null,
			count: 7,
			enabled: false,
			empty: '',
			zero: 0,
			'content type': 'application/json',
			'0': 'zero-key',
		},
		headers: { 'x-api-key': 'secret' },
		params: {},
		query: { a: { b: { c: 'deep' } } },
	};

	test.each<[string, unknown]>([
		// dot notation
		['.body.contact.id', 42],
		['.query.a.b.c', 'deep'],
		['.headers', source.headers],
		// bracket notation, both quote styles
		[".headers['x-api-key']", 'secret'],
		['.headers["x-api-key"]', 'secret'],
		["['body']['contact']['id']", 42],
		[".body['content type']", 'application/json'],
		["[ 'body' ][ 'count' ]", 7],
		// array indexing
		['.body.items[0]', 'first'],
		['.body.items[1]', 'second'],
		["['body']['0']", 'zero-key'],
		// falsy values survive the walk
		['.body.flag', null],
		['.body.enabled', false],
		['.body.empty', ''],
		['.body.zero', 0],
		// missing segments resolve to undefined, like optional chaining
		['.body.missing', undefined],
		['.body.missing.deeper', undefined],
		['.missing[0].x', undefined],
		['.body.items[9]', undefined],
		[".body['']", undefined],
		// walking through a non-object stops with undefined instead of throwing
		['.body.flag.nested', undefined],
		['.body.count.nested', undefined],
		['.body.empty.nested', undefined],
		['.headers["x-api-key"].length', undefined],
	])('should resolve %j to %j', (pathExpr, expected) => {
		expect(resolveRequestFieldPath(source, pathExpr)).toEqual(expected);
	});

	it('should return the source itself for an empty path', () => {
		expect(resolveRequestFieldPath(source, '')).toBe(source);
	});

	it("should not throw when reading ['__proto__'] or ['constructor']", () => {
		expect(() => resolveRequestFieldPath(source, ".body['__proto__']")).not.toThrow();
		expect(() => resolveRequestFieldPath(source, ".body['constructor']['constructor']")).not.toThrow();
	});
});
