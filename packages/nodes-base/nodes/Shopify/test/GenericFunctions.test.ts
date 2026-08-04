import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';

import { shopifyApiRequestAllItems } from '../GenericFunctions';

const BASE_URL = 'https://test-shop.myshopify.com/admin/api/2024-07';

/** Resources are passed with a leading slash, so the built URL carries a double slash. */
const resourceUrl = (resource: string) => `${BASE_URL}/${resource}`;

const pageUrl = (pageInfo: string) => `${BASE_URL}/products.json?limit=2&page_info=${pageInfo}`;

/** Builds a `resolveWithFullResponse` style response for the products resource. */
const productPage = (products: IDataObject[], link?: string) => ({
	body: { products },
	headers: link === undefined ? {} : { link },
});

describe('Shopify -> shopifyApiRequestAllItems', () => {
	const requestWithAuthentication = vi.fn();

	const mockThis = {
		getNodeParameter: vi.fn().mockReturnValue('accessToken'),
		getCredentials: vi.fn().mockResolvedValue({ shopSubdomain: 'test-shop' }),
		getNode: vi.fn().mockReturnValue({}),
		helpers: { requestWithAuthentication },
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
		// Fails the test loudly instead of hanging when one page too many is requested.
		requestWithAuthentication.mockImplementation(() => {
			throw new Error('made more requests than the test provided pages');
		});
	});

	it('makes a single request when the response has no link header', async () => {
		requestWithAuthentication.mockResolvedValueOnce(productPage([{ id: 1 }, { id: 2 }]));

		const result = await shopifyApiRequestAllItems.call(
			mockThis,
			'products',
			'GET',
			'/products.json',
		);

		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
		expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('follows the next link and not the previous one', async () => {
		requestWithAuthentication
			.mockResolvedValueOnce(
				productPage([{ id: 1 }, { id: 2 }], `<${pageUrl('PAGE2')}>; rel="next"`),
			)
			// From page two onwards Shopify sends the previous link first.
			.mockResolvedValueOnce(
				productPage(
					[{ id: 3 }, { id: 4 }],
					`<${pageUrl('PAGE1')}>; rel="previous", <${pageUrl('PAGE3')}>; rel="next"`,
				),
			)
			.mockResolvedValueOnce(productPage([{ id: 5 }], `<${pageUrl('PAGE2')}>; rel="previous"`));

		const result = await shopifyApiRequestAllItems.call(
			mockThis,
			'products',
			'GET',
			'/products.json',
		);

		expect(requestWithAuthentication).toHaveBeenCalledTimes(3);
		const requestedUris = requestWithAuthentication.mock.calls.map(([, options]) => options.uri);
		expect(requestedUris).toEqual([
			resourceUrl('/products.json'),
			pageUrl('PAGE2'),
			pageUrl('PAGE3'),
		]);
		expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
	});

	it('stops when the last page only links to the previous one', async () => {
		requestWithAuthentication
			.mockResolvedValueOnce(productPage([{ id: 1 }], `<${pageUrl('PAGE2')}>; rel="next"`))
			.mockResolvedValueOnce(productPage([{ id: 2 }], `<${pageUrl('PAGE1')}>; rel="previous"`));

		const result = await shopifyApiRequestAllItems.call(
			mockThis,
			'products',
			'GET',
			'/products.json',
		);

		expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it.each([
		['no space before rel', `<${pageUrl('PAGE2')}>;rel="next"`],
		['extra spaces before rel', `<${pageUrl('PAGE2')}>;   rel="next"`],
		[
			'no space after the separating comma',
			`<${pageUrl('PAGE1')}>; rel="previous",<${pageUrl('PAGE2')}>; rel="next"`,
		],
	])('parses a link header with %s', async (_name, link) => {
		requestWithAuthentication
			.mockResolvedValueOnce(productPage([{ id: 1 }], link))
			.mockResolvedValueOnce(productPage([{ id: 2 }]));

		const result = await shopifyApiRequestAllItems.call(
			mockThis,
			'products',
			'GET',
			'/products.json',
		);

		expect(requestWithAuthentication.mock.calls[1][1].uri).toBe(pageUrl('PAGE2'));
		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});
});
