import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { parseNextPageLink } from '../parseNextPageLink';

describe('parseNextPageLink', () => {
	const context = mock<IExecuteFunctions>();
	context.getNode.mockReturnValue(mock<INode>());

	const parse = (link: string) => {
		const { resource, qs } = parseNextPageLink(context, link, requestPath`/v1/items/list`);
		return { path: resource.value, qs };
	};

	it('should return the path and query of an ordinary link', () => {
		expect(parse('/vedsdk/certificates/?limit=1&offset=1')).toEqual({
			path: '/vedsdk/certificates/',
			qs: { limit: '1', offset: '1' },
		});
	});

	it('should keep repeated query keys as an array', () => {
		expect(parse('/v1/items?tag=a&tag=b&page=2').qs).toEqual({ tag: ['a', 'b'], page: '2' });
	});

	it('should keep the current path for a link with only a query', () => {
		expect(parse('?page=2')).toEqual({ path: '/v1/items/list', qs: { page: '2' } });
	});

	it('should resolve a relative path from the current path', () => {
		expect(parse('next?page=2')).toEqual({ path: '/v1/items/next', qs: { page: '2' } });
	});

	it('should keep a query key named __proto__ as an own property', () => {
		const { qs } = parse('/v1/items?__proto__=x&page=2');
		expect(Object.getPrototypeOf(qs)).toBe(Object.prototype);
		expect(Object.keys(qs)).toEqual(['__proto__', 'page']);
		expect(Object.getOwnPropertyDescriptor(qs, '__proto__')?.value).toBe('x');
		expect(qs.page).toBe('2');
	});

	it('should ignore the host of the link', () => {
		expect(parse('https://other.example/v1/items?page=2')).toEqual({
			path: '/v1/items',
			qs: { page: '2' },
		});
		expect(parse('//other.example/x').path).toBe('/x');
	});

	it.each(['@other.example/page', '.other.example/page'])(
		'should keep %s inside the path',
		(link) => {
			expect(parse(link).path).toBe(`/v1/items/${link}`);
		},
	);

	it('should encode a path segment once', () => {
		expect(parse('/v1/items/a%2Fb%3Fc').path).toBe('/v1/items/a%2Fb%3Fc');
	});

	it('should throw when a segment cannot be decoded', () => {
		expect(() => parseNextPageLink(context, '/v1/items/%E0%A4%A', requestPath`/v1/items`)).toThrow(
			'Unexpected next page link',
		);
	});
});
