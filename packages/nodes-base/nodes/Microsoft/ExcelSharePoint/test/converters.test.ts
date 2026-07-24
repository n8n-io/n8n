import {
	buildRequestOptions,
	toGraphBaseUrl,
	toHttpCode,
	toPermissionKey,
	unwrapGraphError,
} from '../helpers/converters';

describe('Microsoft Excel (SharePoint) Converters', () => {
	describe('toHttpCode', () => {
		it('passes a number through unchanged', () => {
			expect(toHttpCode(404)).toBe(404);
		});

		it('parses a numeric string', () => {
			expect(toHttpCode('403')).toBe(403);
		});

		it('returns undefined for undefined', () => {
			expect(toHttpCode(undefined)).toBeUndefined();
		});

		it('returns undefined for null', () => {
			expect(toHttpCode(null)).toBeUndefined();
		});

		it('returns undefined for a non-numeric string', () => {
			expect(toHttpCode('oops')).toBeUndefined();
		});
	});

	describe('toGraphBaseUrl', () => {
		it('returns an explicit URL unchanged', () => {
			expect(toGraphBaseUrl('https://graph.microsoft.us')).toBe('https://graph.microsoft.us');
		});

		it('trims trailing slashes', () => {
			expect(toGraphBaseUrl('https://graph.microsoft.com//')).toBe('https://graph.microsoft.com');
		});

		it('defaults to the public cloud when undefined', () => {
			expect(toGraphBaseUrl(undefined)).toBe('https://graph.microsoft.com');
		});

		it('defaults to the public cloud when an empty string', () => {
			expect(toGraphBaseUrl('')).toBe('https://graph.microsoft.com');
		});
	});

	describe('unwrapGraphError', () => {
		it('unwraps the nested error while preserving the outer status code', () => {
			const error = {
				statusCode: 404,
				error: { error: { code: 'NotFound', message: 'Resource not found' } },
			};

			expect(unwrapGraphError(error)).toEqual({
				code: 'NotFound',
				message: 'Resource not found',
				statusCode: 404,
			});
		});

		it('leaves a non-nested error untouched', () => {
			const error = { statusCode: 403, message: 'Access denied' };

			expect(unwrapGraphError(error)).toBe(error);
		});

		it('unwraps a nested error under context.data.error, the shape a NodeApiError-wrapped failure has', () => {
			const error = {
				statusCode: 404,
				context: { data: { error: { code: 'ItemNotFound', message: "Doesn't exist" } } },
			};

			expect(unwrapGraphError(error)).toEqual({
				code: 'ItemNotFound',
				message: "Doesn't exist",
				statusCode: 404,
			});
		});
	});

	describe('toPermissionKey', () => {
		it('joins resource and operation into the lookup key format', () => {
			expect(toPermissionKey('worksheet', 'readRows')).toBe('worksheet:readRows');
		});
	});

	describe('buildRequestOptions', () => {
		it('builds the url from the base URL and resource with the default Content-Type header', () => {
			const options = buildRequestOptions({
				method: 'GET',
				resource: '/v1.0/sites/s',
				body: {},
				qs: {},
				headers: {},
				graphApiBaseUrl: 'https://graph.microsoft.com',
			});

			expect(options).toEqual({
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				body: {},
				qs: {},
				url: 'https://graph.microsoft.com/v1.0/sites/s',
				json: true,
			});
		});

		it('uses an explicit uri verbatim over the base URL and resource', () => {
			const options = buildRequestOptions({
				method: 'GET',
				resource: '/ignored',
				body: {},
				qs: {},
				uri: 'https://graph.microsoft.com/v1.0/sites?$skiptoken=abc',
				headers: {},
				graphApiBaseUrl: 'https://graph.microsoft.com',
			});

			expect(options.url).toBe('https://graph.microsoft.com/v1.0/sites?$skiptoken=abc');
		});

		it('merges extra headers into the default Content-Type header', () => {
			const options = buildRequestOptions({
				method: 'GET',
				resource: '/v1.0/sites/s',
				body: {},
				qs: {},
				headers: { 'If-Match': '*' },
				graphApiBaseUrl: 'https://graph.microsoft.com',
			});

			expect(options.headers).toEqual({
				'Content-Type': 'application/json',
				'If-Match': '*',
			});
		});
	});
});
