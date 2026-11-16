import { describe, expect, it } from 'vitest';

import type { IHttpRequestOptions, WithRequestTarget } from '../src/interfaces';
import {
	decodePathValue,
	requestPath,
	requestUrl,
	type RequestPath,
	type RequestUrl,
} from '../src/request-target';

describe('requestPath', () => {
	it('returns a static path unchanged', () => {
		// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
		expect(requestPath`channels/members`.value).toBe('channels/members');
	});

	it('encodes interpolated values and keeps the static separators', () => {
		const channelId = 'sales/europe west';
		const memberId = 'user?#1';

		expect(requestPath`channels/${channelId}/members/${memberId}`.value).toBe(
			'channels/sales%2Feurope%20west/members/user%3F%231',
		);
	});

	it('encodes a value at the start of the path', () => {
		expect(requestPath`${'https://attack.com'}/messages`.value).toBe(
			'https%3A%2F%2Fattack.com/messages',
		);
	});

	it('keeps characters that are valid inside a path segment', () => {
		expect(requestPath`contacts/${'a@b.com'}/ranges/${'Sheet1!A1:B2'}`.value).toBe(
			'contacts/a@b.com/ranges/Sheet1!A1:B2',
		);
		expect(requestPath`items/${'AAMk=,$&'}`.value).toBe('items/AAMk=,$&');
	});

	it('encodes a plus sign', () => {
		expect(requestPath`docs/${'a+b'}`.value).toBe('docs/a%2Bb');
	});

	it.each([
		['a%2Fb', 'a%252Fb'],
		['My%20Table', 'My%2520Table'],
		['50%off', '50%25off'],
		['%2E%2E', '%252E%252E'],
	])('encodes a percent sign as part of the value: %s', (value, expected) => {
		expect(requestPath`items/${value}`.value).toBe(`items/${expected}`);
	});

	it('encodes a semicolon', () => {
		expect(requestPath`items/${'..;'}`.value).toBe('items/..%3B');
	});

	it('encodes a colon in the first segment', () => {
		expect(requestPath`${'http:evil.com'}/items/${'a:b'}`.value).toBe('http%3Aevil.com/items/a:b');
		expect(requestPath`v1${'x:y'}`.value).toBe('v1x%3Ay');
	});

	it('keeps false and zero', () => {
		expect(requestPath`flags/${false}/items/${0}`.value).toBe('flags/false/items/0');
	});

	it.each(['', '.', '..', null, undefined])('rejects the value %s', (value) => {
		expect(() => requestPath`channels/${value}/members`).toThrow();
	});

	it.each(['../x', 'a/../b', '..\\x', './x', 'x/..'])(
		'should reject a value with a dot segment: %s',
		(value) => {
			expect(() => requestPath`items/${value}/members`).toThrow();
		},
	);

	it.each([
		['..%252Fx', 'items/..%25252Fx'],
		['a..b', 'items/a..b'],
		['...', 'items/...'],
		['v1.0', 'items/v1.0'],
	])('should accept a value without a dot segment: %s', (value, expected) => {
		expect(requestPath`items/${value}`.value).toBe(expected);
	});

	it('does not encode a nested requestPath twice', () => {
		const inner = requestPath`channels/${'a/b'}`;

		expect(requestPath`api/${inner}/members`.value).toBe('api/channels/a%2Fb/members');
	});
});

describe('decodePathValue', () => {
	it.each([
		['a%2Fb', 'a/b'],
		['My%20Table', 'My Table'],
		['%23room:example.com', '#room:example.com'],
		['release%2f1.0', 'release/1.0'],
		['a%252Fb', 'a%2Fb'],
		['50%off', '50%off'],
		['100%', '100%'],
		['%E0%A4%A', '%E0%A4%A'],
		['plain', 'plain'],
	])('decodes %s once', (value, expected) => {
		expect(decodePathValue(value)).toBe(expected);
	});

	it.each([12, 0, true, null, undefined])('returns the non-string value %s unchanged', (value) => {
		expect(decodePathValue(value)).toBe(value);
	});

	it('lets requestPath encode a number and reject a missing value', () => {
		expect(requestPath`items/${decodePathValue(12)}`.value).toBe('items/12');
		expect(() => requestPath`items/${decodePathValue(null)}`).toThrow();
		expect(() => requestPath`items/${decodePathValue(undefined)}`).toThrow();
	});

	it.each([
		['release%2F1.0', 'release%2F1.0'],
		['My%20Table', 'My%20Table'],
		['a%252Fb', 'a%252Fb'],
	])('gives the same path segment as a value that was sent unencoded: %s', (value, expected) => {
		expect(requestPath`items/${decodePathValue(value)}`.value).toBe(`items/${expected}`);
	});

	it('lets requestPath reject a decoded dot segment with a slash', () => {
		expect(() => requestPath`items/${decodePathValue('..%2Fx')}`).toThrow();
	});

	it.each(['%2E%2E', '%2e', '%2E'])('lets requestPath reject the decoded value %s', (value) => {
		expect(() => requestPath`items/${decodePathValue(value)}`).toThrow();
	});
});

describe('requestUrl', () => {
	describe('with a static host', () => {
		it('encodes values after the host', () => {
			expect(requestUrl`https://api.example.com/v1/${'a/b'}/items/${'..%2f'}`.value).toBe(
				'https://api.example.com/v1/a%2Fb/items/..%252f',
			);
		});

		it('accepts a host label inside the host', () => {
			expect(requestUrl`https://${'eu-west-1'}.aws.com/${'x y'}`.value).toBe(
				'https://eu-west-1.aws.com/x%20y',
			);
		});

		it.each(['attack.com/ok', 'a@b', 'a:80', 'a#', 'a?', '', 'a b'])(
			'rejects the host label %j',
			(label) => {
				expect(() => requestUrl`https://${label}.aws.com/x`).toThrow();
			},
		);

		it('accepts a request path that starts with a slash right after a static host', () => {
			expect(requestUrl`https://api.example.com${requestPath`/users/${1}`}`.value).toBe(
				'https://api.example.com/users/1',
			);
			expect(() => requestUrl`https://api.example.com${requestPath`users`}`).toThrow();
		});

		it('accepts a host that ends with a value', () => {
			expect(requestUrl`https://api.${'example.com'}`.value).toBe('https://api.example.com');
			expect(requestUrl`https://${'example.com'}`.value).toBe('https://example.com');
		});

		it('accepts a value next to static host text', () => {
			expect(requestUrl`https://api-${'eu'}.example.com/x`.value).toBe(
				'https://api-eu.example.com/x',
			);
			expect(requestUrl`https://api.example.${'com'}/x`.value).toBe('https://api.example.com/x');
		});

		it('rejects a request path that is not rooted right after the host', () => {
			expect(() => requestUrl`https://api.example.com${requestPath`users`}`).toThrow();
		});

		it('rejects a value in the query', () => {
			expect(() => requestUrl`https://api.example.com/items?id=${'1'}`).toThrow();
		});

		it('rejects a template without a scheme', () => {
			expect(() => requestUrl`/items/${'1'}`).toThrow();
			expect(() => requestUrl`ftp://example.com/${'1'}`).toThrow();
		});

		it('does not treat the slashes of the scheme as the end of the host', () => {
			expect(requestUrl`https://${'a'}.example.com/`.value).toBe('https://a.example.com/');
		});
	});

	describe('with a leading base URL', () => {
		it('keeps the origin and a path prefix and encodes the rest', () => {
			const baseUrl = 'https://Mattermost.example.com:8443/chat/';

			expect(requestUrl`${baseUrl}/api/v4/${'a/b'}`.value).toBe(
				'https://mattermost.example.com:8443/chat/api/v4/a%2Fb',
			);
		});

		it('accepts a base URL without anything after it', () => {
			expect(requestUrl`${'https://example.com/'}`.value).toBe('https://example.com');
		});

		it.each([
			['https://user:pass@example.com/api/', 'https://user:pass@example.com/api/x'],
			['https://user@example.com', 'https://user@example.com/x'],
			['https://us%40er:p%3Ass@example.com', 'https://us%40er:p%3Ass@example.com/x'],
		])('keeps the user info of the base URL %s', (baseUrl, expected) => {
			expect(requestUrl`${baseUrl}/x`.value).toBe(expected);
		});

		it.each([
			'attack.com',
			'//attack.com',
			'javascript:alert(1)',
			'ftp://example.com',
			'https://example.com?x=1',
			'https://example.com#x',
			'',
		])('rejects the base URL %j', (baseUrl) => {
			expect(() => requestUrl`${baseUrl}/x`).toThrow();
		});

		it('accepts a request path that starts with a slash right after the base URL', () => {
			const endpoint = requestPath`/users/${'a/b'}`;

			expect(requestUrl`${'https://example.com/api'}${endpoint}`.value).toBe(
				'https://example.com/api/users/a%2Fb',
			);
		});

		it('rejects a request path that starts with a value right after the base URL', () => {
			const endpoint = requestPath`${'.attack.com'}/users`;

			expect(() => requestUrl`${'https://example.com'}${endpoint}`).toThrow();
		});

		it('rejects a value that continues the host', () => {
			expect(() => requestUrl`${'https://example.com'}${'.attack.com'}`).toThrow();
			expect(() => requestUrl`${'https://example.com'}.attack.com/${'x'}`).toThrow();
		});
	});
});

describe('requestUrl host rules', () => {
	it('accepts a dotted value that is followed by a static domain', () => {
		expect(requestUrl`https://${'my.bucket'}.s3.amazonaws.com/${'a/b'}`.value).toBe(
			'https://my.bucket.s3.amazonaws.com/a%2Fb',
		);
	});

	it('accepts a static host with a port value', () => {
		expect(requestUrl`https://example.com:${8080}/x`.value).toBe('https://example.com:8080/x');
		expect(() => requestUrl`https://example.com:${'80a'}/x`).toThrow();
	});

	it.each([
		['localhost', 'https://localhost/api'],
		['example.com', 'https://example.com/api'],
		['192.168.1.5', 'https://192.168.1.5/api'],
		['[::1]', 'https://[::1]/api'],
	])('accepts a host that is only a value: %s', (host, expected) => {
		expect(requestUrl`https://${host}/api`.value).toBe(expected);
	});

	it('accepts a host and a port that are only values', () => {
		expect(requestUrl`https://${'example.com'}:${8080}/x`.value).toBe('https://example.com:8080/x');
	});

	it('accepts values in more than one host label', () => {
		expect(requestUrl`https://${'a'}.${'b'}.example.com/x`.value).toBe('https://a.b.example.com/x');
		expect(requestUrl`https://api.venafi.${'eu'}${requestPath`/v1/${'a/b'}`}`.value).toBe(
			'https://api.venafi.eu/v1/a%2Fb',
		);
	});

	it.each(['example.com/x', 'a@example.com', 'example.com:80', 'example.com#', 'example.com?', ''])(
		'rejects the host value %j',
		(host) => {
			expect(() => requestUrl`https://${host}/api`).toThrow();
		},
	);

	it('rejects a port value that is not a number or is followed by more host text', () => {
		expect(() => requestUrl`https://example.com:${'80/x'}/api`).toThrow();
		expect(() => requestUrl`https://example.com:${80}.attack.com/api`).toThrow();
	});

	it('accepts a host value after static user info and a port value at the end', () => {
		expect(requestUrl`https://user@${'example.com'}/x`.value).toBe('https://user@example.com/x');
		expect(requestUrl`https://${'[::1]'}:${8443}/x`.value).toBe('https://[::1]:8443/x');
		expect(requestUrl`https://example.com:${8080}`.value).toBe('https://example.com:8080');
	});

	it('accepts host values next to each other', () => {
		expect(requestUrl`https://${'a'}${'b'}.example.com/x`.value).toBe('https://ab.example.com/x');
	});

	it('rejects a template without a host', () => {
		expect(() => requestUrl`https:///${'a@example.com:1'}/x`).toThrow();
		expect(() => requestUrl`https://${requestPath`/${'u:p@example.com'}`}`).toThrow();
		expect(() => requestUrl`https://api.${requestPath`/x`}`).toThrow();
	});

	it('rejects a request path that is not rooted in the host', () => {
		expect(() => requestUrl`https://${requestPath`users`}/x`).toThrow();
	});

	it.each(['http://2130706433', 'http://0x7f000001', 'http://127.1'])(
		'accepts a base URL with a numeric host: %s',
		(base) => {
			expect(() => requestUrl`${base}/x`).not.toThrow();
		},
	);

	it.each([
		['http://10.0.0.5:8080', 'http://10.0.0.5:8080/x'],
		['http://mattermost:8065', 'http://mattermost:8065/x'],
		['https://[::1]:8443', 'https://[::1]:8443/x'],
	])('accepts the base URL %s', (base, expected) => {
		expect(requestUrl`${base}/x`.value).toBe(expected);
	});
});

describe('request target types', () => {
	it('requires a requestPath when baseURL is set and a requestUrl when it is not', () => {
		const path = requestPath`messages/${1}`;
		const url = requestUrl`https://example.com/messages/${1}`;
		type Options = WithRequestTarget<IHttpRequestOptions>;

		const withBase: Options = { baseURL: 'https://example.com', url: path };
		const withoutBase: Options = { url };
		// @ts-expect-error A relative path needs a baseURL.
		const pathWithoutBase: Options = { url: path };
		// @ts-expect-error A full URL must not be combined with a baseURL.
		const urlWithBase: Options = { baseURL: 'https://example.com', url };
		// @ts-expect-error Plain strings are not accepted.
		const plainString: Options = { url: 'messages/1' };

		expect([withBase, withoutBase, pathWithoutBase, urlWithBase, plainString]).toHaveLength(5);
	});

	it('cannot be forged with a plain object', () => {
		// @ts-expect-error A plain object is not a RequestPath.
		const forgedPath: RequestPath = { value: '../x' };
		// @ts-expect-error A plain object is not a RequestUrl.
		const forgedUrl: RequestUrl = { value: 'https://attack.com' };

		expect([forgedPath, forgedUrl]).toHaveLength(2);
	});
});

describe('string conversion', () => {
	it('converts to the encoded value', () => {
		const path = requestPath`items/${'a/b'}`;
		const url = requestUrl`https://example.com/${'a/b'}`;

		expect(String(path)).toBe('items/a%2Fb');
		expect(String(url)).toBe('https://example.com/a%2Fb');
		expect(JSON.stringify({ path, url })).toBe(
			'{"path":"items/a%2Fb","url":"https://example.com/a%2Fb"}',
		);
	});
});
