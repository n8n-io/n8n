import type * as n8nWorkflow from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest, dataverseApiRequestAllItems } from '../GenericFunctions';

// Neutralize the retry back-off so tests don't actually wait.
vi.mock('n8n-workflow', async (importActual) => {
	const actual = await importActual<typeof n8nWorkflow>();
	return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';
const BASE_URL = 'https://org.crm.dynamics.com';
const API_PATH = '/api/data/v9.2';

describe('Microsoft Dataverse GenericFunctions', () => {
	let ctx: ReturnType<typeof mockDeep<IExecuteFunctions>>;
	let request: ReturnType<typeof vi.fn>;

	const node: INode = {
		id: 'test-node',
		name: 'Microsoft Dataverse',
		type: 'n8n-nodes-base.microsoftDataverse',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(node);
		ctx.getCredentials.mockResolvedValue({ environmentUrl: BASE_URL });
		request = vi.fn();
		ctx.helpers.httpRequestWithAuthentication = request as never;
	});

	describe('dataverseApiRequest', () => {
		it('builds the URL, sets versioned User-Agent, and returns the response', async () => {
			request.mockResolvedValue({ value: 'ok' });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 'ok' });
			expect(request).toHaveBeenCalledTimes(1);
			const [credType, options] = request.mock.calls[0];
			expect(credType).toBe(CREDENTIAL_TYPE);
			expect(options.url).toBe(`${BASE_URL}${API_PATH}/accounts`);
			expect(options.json).toBe(true);
			expect(options.headers).toMatchObject({
				Accept: 'application/json',
				'OData-MaxVersion': '4.0',
				'OData-Version': '4.0',
				'User-Agent': 'n8n-nodes-base.microsoftDataverse/1.0',
				'Content-Type': 'application/json; charset=utf-8',
			});
		});

		it('omits the body when it is empty', async () => {
			request.mockResolvedValue({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			const [, options] = request.mock.calls[0];
			expect(options).not.toHaveProperty('body');
		});

		it('sends the body when provided', async () => {
			request.mockResolvedValue({});

			await dataverseApiRequest(
				ctx,
				'POST',
				'/accounts',
				{ name: 'Acme' },
				{},
				{},
				CREDENTIAL_TYPE,
			);

			const [, options] = request.mock.calls[0];
			expect(options.body).toEqual({ name: 'Acme' });
		});

		it('strips a trailing slash from the environment URL', async () => {
			ctx.getCredentials.mockResolvedValue({ environmentUrl: `${BASE_URL}/` });
			request.mockResolvedValue({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			const [, options] = request.mock.calls[0];
			expect(options.url).toBe(`${BASE_URL}${API_PATH}/accounts`);
		});

		it('wraps a failure in NodeApiError', async () => {
			request.mockRejectedValue({ statusCode: 400, message: 'Bad Request' });

			await expect(
				dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE),
			).rejects.toThrow(NodeApiError);
		});

		it('does not retry a non-transient 400', async () => {
			request.mockRejectedValue({ statusCode: 400 });

			await expect(
				dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE),
			).rejects.toThrow(NodeApiError);
			expect(request).toHaveBeenCalledTimes(1);
			expect(sleep).not.toHaveBeenCalled();
		});

		it('retries a transient 429 then succeeds', async () => {
			request
				.mockRejectedValueOnce({ statusCode: 429 })
				.mockResolvedValueOnce({ value: 'recovered' });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 'recovered' });
			expect(request).toHaveBeenCalledTimes(2);
			expect(sleep).toHaveBeenCalledTimes(1);
		});

		it('honors the Retry-After header over computed back-off', async () => {
			request
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': '2' } },
				})
				.mockResolvedValueOnce({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			expect(sleep).toHaveBeenCalledWith(2000);
		});

		it('honors a capitalized Retry-After header', async () => {
			request
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'Retry-After': '3' } },
				})
				.mockResolvedValueOnce({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			expect(sleep).toHaveBeenCalledWith(3000);
		});

		it('honors a Retry-After HTTP-date over computed back-off', async () => {
			const twoSecondsFromNow = new Date(Date.now() + 2000).toUTCString();
			request
				.mockRejectedValueOnce({
					statusCode: 429,
					response: { headers: { 'retry-after': twoSecondsFromNow } },
				})
				.mockResolvedValueOnce({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			expect(sleep).toHaveBeenCalledTimes(1);
			const [delay] = (sleep as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
			// Allow a little slack for the clock advancing between throw and read.
			expect(delay).toBeGreaterThan(0);
			expect(delay).toBeLessThanOrEqual(2000);
		});

		it('retries a transient network error (ECONNRESET) then succeeds', async () => {
			request.mockRejectedValueOnce({ code: 'ECONNRESET' }).mockResolvedValueOnce({ value: 1 });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 1 });
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('retries a bare "socket hang up" message with no error code', async () => {
			request
				.mockRejectedValueOnce({ message: 'socket hang up' })
				.mockResolvedValueOnce({ value: 1 });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 1 });
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('retries a socket error nested under error.cause.code', async () => {
			request
				.mockRejectedValueOnce({ cause: { code: 'ETIMEDOUT' } })
				.mockResolvedValueOnce({ value: 1 });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 1 });
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('retries a transient 504 then succeeds', async () => {
			request.mockRejectedValueOnce({ statusCode: 504 }).mockResolvedValueOnce({ value: 'ok' });

			const result = await dataverseApiRequest(
				ctx,
				'GET',
				'/accounts',
				{},
				{},
				{},
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual({ value: 'ok' });
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('gives up after the maximum number of retries on a persistent 503', async () => {
			request.mockRejectedValue({ statusCode: 503 });

			await expect(
				dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE),
			).rejects.toThrow(NodeApiError);

			// 1 initial + 3 retries = 4 dispatches, 3 back-off sleeps.
			expect(request).toHaveBeenCalledTimes(4);
			expect(sleep).toHaveBeenCalledTimes(3);
		});

		it('sets a request timeout and a version-derived User-Agent', async () => {
			ctx.getNode.mockReturnValue({ ...node, typeVersion: 2 });
			request.mockResolvedValue({});

			await dataverseApiRequest(ctx, 'GET', '/accounts', {}, {}, {}, CREDENTIAL_TYPE);

			const [, options] = request.mock.calls[0];
			expect(options.timeout).toBe(60_000);
			expect(options.headers['User-Agent']).toBe('n8n-nodes-base.microsoftDataverse/2.0');
		});
	});

	describe('dataverseApiRequestAllItems', () => {
		it('follows @odata.nextLink and aggregates every page', async () => {
			request
				.mockResolvedValueOnce({
					value: [{ id: 1 }],
					'@odata.nextLink': 'https://org.crm.dynamics.com/next',
				})
				.mockResolvedValueOnce({ value: [{ id: 2 }] });

			const result = await dataverseApiRequestAllItems(
				ctx,
				'GET',
				'/accounts',
				{},
				0,
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
			expect(request).toHaveBeenCalledTimes(2);
			const [, secondOptions] = request.mock.calls[1];
			expect(secondOptions.url).toBe('https://org.crm.dynamics.com/next');
			// nextLink already encodes the query string, so qs must not be resent.
			expect(secondOptions.qs).toBeUndefined();
		});

		it('stops once the requested limit is reached', async () => {
			request.mockResolvedValueOnce({
				value: [{ id: 1 }, { id: 2 }, { id: 3 }],
				'@odata.nextLink': 'https://org.crm.dynamics.com/next',
			});

			const result = await dataverseApiRequestAllItems(
				ctx,
				'GET',
				'/accounts',
				{},
				1,
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual([{ id: 1 }]);
			expect(request).toHaveBeenCalledTimes(1);
		});

		it('merges a caller Prefer header with the page-size hint', async () => {
			request.mockResolvedValueOnce({ value: [] });

			await dataverseApiRequestAllItems(ctx, 'GET', '/accounts', {}, 0, CREDENTIAL_TYPE, {
				Prefer: 'return=representation',
			});

			const [, options] = request.mock.calls[0];
			expect(options.headers.Prefer).toBe('return=representation,odata.maxpagesize=100');
		});

		it('applies only the page-size hint when no caller Prefer is given', async () => {
			request.mockResolvedValueOnce({ value: [] });

			await dataverseApiRequestAllItems(ctx, 'GET', '/accounts', {}, 0, CREDENTIAL_TYPE);

			const [, options] = request.mock.calls[0];
			expect(options.headers.Prefer).toBe('odata.maxpagesize=100');
		});

		it('returns an empty array when a page has no value field', async () => {
			request.mockResolvedValueOnce({});

			const result = await dataverseApiRequestAllItems(
				ctx,
				'GET',
				'/accounts',
				{},
				0,
				CREDENTIAL_TYPE,
			);

			expect(result).toEqual([]);
			expect(request).toHaveBeenCalledTimes(1);
		});

		it('wraps a paging failure in NodeApiError', async () => {
			request.mockRejectedValue({ statusCode: 400, message: 'Bad Request' });

			await expect(
				dataverseApiRequestAllItems(ctx, 'GET', '/accounts', {}, 0, CREDENTIAL_TYPE),
			).rejects.toThrow(NodeApiError);
		});
	});
});
