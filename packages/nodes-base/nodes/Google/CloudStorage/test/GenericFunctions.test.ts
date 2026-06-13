import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { getGoogleAccessToken } from '../../GenericFunctions';
import { authenticateServiceAccount, searchProjects } from '../GenericFunctions';

const requestOAuth2 = jest.fn();
const httpRequest = jest.fn();

jest.mock('../../GenericFunctions', () => ({
	getGoogleAccessToken: jest.fn(),
}));

const getGoogleAccessTokenMock = getGoogleAccessToken as jest.MockedFunction<
	typeof getGoogleAccessToken
>;

describe('Google Cloud Storage GenericFunctions', () => {
	let mockContext: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = mock<ILoadOptionsFunctions>();
		mockContext.helpers = {
			requestOAuth2,
			httpRequest,
		} as unknown as typeof mockContext.helpers;
		jest.clearAllMocks();
	});

	describe('searchProjects', () => {
		it('returns formatted project results', async () => {
			requestOAuth2.mockResolvedValueOnce({
				projects: [
					{ name: 'My Project', projectId: 'my-project' },
					{ name: 'Other Project', projectId: 'other-project' },
				],
			});

			const result = await searchProjects.call(mockContext);

			expect(result.results).toEqual([
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'My Project (my-project)',
					value: 'my-project',
					url: 'https://console.cloud.google.com/storage/browser?project=my-project',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'Other Project (other-project)',
					value: 'other-project',
					url: 'https://console.cloud.google.com/storage/browser?project=other-project',
				},
			]);
		});

		it('always filters to active lifecycle state', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext);

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({ filter: 'lifecycleState:ACTIVE' }),
				}),
			);
		});

		it('passes filter string as server-side query parameter', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext, 'myproj');

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({
						filter: '(name:myproj* OR id:myproj*) AND lifecycleState:ACTIVE',
					}),
				}),
			);
		});

		it('passes pagination token when provided', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext, undefined, 'page-token-123');

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({ pageToken: 'page-token-123' }),
				}),
			);
		});

		it('returns pagination token from response', async () => {
			requestOAuth2.mockResolvedValueOnce({
				projects: [],
				nextPageToken: 'next-page',
			});

			const result = await searchProjects.call(mockContext);

			expect(result.paginationToken).toBe('next-page');
		});

		it('handles response with no projects', async () => {
			requestOAuth2.mockResolvedValueOnce({});

			const result = await searchProjects.call(mockContext);

			expect(result.results).toHaveLength(0);
			expect(result.paginationToken).toBeUndefined();
		});

		it('falls back to oAuth2 when authentication parameter is missing (legacy workflows)', async () => {
			mockContext.getNodeParameter.mockImplementation(
				((_name: string, fallback: unknown) => fallback) as never,
			);
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext);

			expect(requestOAuth2).toHaveBeenCalledWith('googleCloudStorageOAuth2Api', expect.anything());
			expect(httpRequest).not.toHaveBeenCalled();
		});

		describe('service account branch', () => {
			beforeEach(() => {
				mockContext.getNodeParameter.mockReturnValue('serviceAccount' as never);
				mockContext.getCredentials.mockResolvedValue({
					email: 'svc@example.iam.gserviceaccount.com',
					privateKey: 'PRIVATE_KEY',
				});
				getGoogleAccessTokenMock.mockResolvedValue({ access_token: 'sa-token' });
			});

			it('mints a token via the cloudStorage service account scope', async () => {
				httpRequest.mockResolvedValueOnce({ projects: [] });

				await searchProjects.call(mockContext);

				expect(mockContext.getCredentials).toHaveBeenCalledWith('googleApi');
				expect(getGoogleAccessTokenMock).toHaveBeenCalledWith(
					{
						email: 'svc@example.iam.gserviceaccount.com',
						privateKey: 'PRIVATE_KEY',
					},
					'cloudStorage',
				);
			});

			it('calls httpRequest with the bearer token and skips requestOAuth2', async () => {
				httpRequest.mockResolvedValueOnce({ projects: [] });

				await searchProjects.call(mockContext);

				expect(httpRequest).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'GET',
						url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
						headers: { Authorization: 'Bearer sa-token' },
						json: true,
						qs: expect.objectContaining({ filter: 'lifecycleState:ACTIVE' }),
					}),
				);
				expect(requestOAuth2).not.toHaveBeenCalled();
			});

			it('formats project results identically to the oAuth2 branch', async () => {
				httpRequest.mockResolvedValueOnce({
					projects: [{ name: 'SA Project', projectId: 'sa-project' }],
					nextPageToken: 'sa-next',
				});

				const result = await searchProjects.call(mockContext);

				expect(result.results).toEqual([
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'SA Project (sa-project)',
						value: 'sa-project',
						url: 'https://console.cloud.google.com/storage/browser?project=sa-project',
					},
				]);
				expect(result.paginationToken).toBe('sa-next');
			});
		});
	});

	describe('authenticateServiceAccount (declarative routing preSend)', () => {
		let ctx: MockProxy<IExecuteSingleFunctions>;
		const baseOptions: IHttpRequestOptions = {
			method: 'GET',
			url: '/b/my-bucket',
			headers: { 'X-Existing': 'keep-me' },
		};

		beforeEach(() => {
			ctx = mock<IExecuteSingleFunctions>();
			jest.clearAllMocks();
		});

		it('returns the request unchanged when authentication is oAuth2', async () => {
			ctx.getNodeParameter.mockReturnValueOnce('oAuth2' as never);

			const result = await authenticateServiceAccount.call(ctx, { ...baseOptions });

			expect(result.headers).toEqual({ 'X-Existing': 'keep-me' });
			expect(ctx.getCredentials).not.toHaveBeenCalled();
			expect(getGoogleAccessTokenMock).not.toHaveBeenCalled();
		});

		it('injects a service-account bearer token and preserves existing headers', async () => {
			ctx.getNodeParameter.mockReturnValueOnce('serviceAccount' as never);
			ctx.getCredentials.mockResolvedValue({
				email: 'svc@example.iam.gserviceaccount.com',
				privateKey: 'PRIVATE_KEY',
			});
			getGoogleAccessTokenMock.mockResolvedValue({ access_token: 'declarative-token' });

			const result = await authenticateServiceAccount.call(ctx, { ...baseOptions });

			expect(ctx.getCredentials).toHaveBeenCalledWith('googleApi');
			expect(getGoogleAccessTokenMock).toHaveBeenCalledWith(
				{
					email: 'svc@example.iam.gserviceaccount.com',
					privateKey: 'PRIVATE_KEY',
				},
				'cloudStorage',
			);
			expect(result.headers).toEqual({
				'X-Existing': 'keep-me',
				Authorization: 'Bearer declarative-token',
			});
		});

		it('handles requests that arrive without any headers set', async () => {
			ctx.getNodeParameter.mockReturnValueOnce('serviceAccount' as never);
			ctx.getCredentials.mockResolvedValue({
				email: 'svc@example.iam.gserviceaccount.com',
				privateKey: 'PRIVATE_KEY',
			});
			getGoogleAccessTokenMock.mockResolvedValue({ access_token: 'declarative-token' });

			const result = await authenticateServiceAccount.call(ctx, {
				method: 'GET',
				url: '/b/my-bucket',
			});

			expect(result.headers).toEqual({ Authorization: 'Bearer declarative-token' });
		});
	});
});
