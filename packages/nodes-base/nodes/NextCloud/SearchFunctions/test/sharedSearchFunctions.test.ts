import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { describe, it, expect, vi } from 'vitest';

import { getNextCloudContext, getUsers } from '../shared/sharedSearchFunctions';

function createMockLoadOptionsFunctions(
	overrides?: Record<string, unknown>,
): ILoadOptionsFunctions {
	return {
		getCredentials: vi.fn(),
		getCurrentNodeParameter: vi.fn(),
		helpers: {
			request: vi.fn(),
			httpRequest: vi.fn(),
		},
		...overrides,
	} as unknown as ILoadOptionsFunctions;
}

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';
const baseUrl = 'https://nextcloud.example.com';

describe('NextCloud sharedSearchFunctions', () => {
	describe('getNextCloudContext', () => {
		it('returns baseUrl and basicAuth with valid credentials', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'alice',
					password: 'secret',
				})),
			});

			const result = await getNextCloudContext(ctx);

			expect(result).not.toBeNull();
			expect(result?.baseUrl).toBe(baseUrl);
			const expectedAuth = Buffer.from('alice:secret').toString('base64');
			expect(result?.basicAuth).toBe(expectedAuth);
		});

		it('returns null when getCredentials throws for accessToken auth', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getNextCloudContext(ctx);

			expect(result).toBeNull();
		});

		it('throws for OAuth2 locators without username/password credentials', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'oAuth2'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
				})),
			});

			await expect(getNextCloudContext(ctx)).rejects.toThrow(
				'Deck resource locators require username/password authentication. OAuth2 is not supported.',
			);
		});

		it('strips /remote.php/webdav from URL', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'alice',
					password: 'secret',
				})),
			});

			const result = await getNextCloudContext(ctx);

			expect(result?.baseUrl).toBe('https://nextcloud.example.com');
			expect(result?.baseUrl).not.toContain('/remote.php/webdav');
		});

		it('strips /remote.php/dav from URL', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl: 'https://nextcloud.example.com/remote.php/dav',
					user: 'alice',
					password: 'secret',
				})),
			});

			const result = await getNextCloudContext(ctx);

			expect(result?.baseUrl).toBe('https://nextcloud.example.com');
			expect(result?.baseUrl).not.toContain('/remote.php/dav');
		});

		it('uses nextCloudOAuth2Api credential when authentication is oAuth2', async () => {
			const getCredentials = vi.fn(() => ({
				webDavUrl,
				user: 'alice',
				password: 'token',
			}));
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'oAuth2'),
				getCredentials,
			});

			await getNextCloudContext(ctx);

			expect(getCredentials).toHaveBeenCalledWith('nextCloudOAuth2Api');
		});
	});

	describe('getUsers', () => {
		it('returns mapped users from OCS response', async () => {
			const request = vi.fn(() => ({
				ocs: { data: { users: ['alice', 'bob', 'charlie'] } },
			}));
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'admin',
					password: 'admin',
				})),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getUsers.call(ctx);

			expect(result.results).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'alice', value: 'alice' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'bob', value: 'bob' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'charlie', value: 'charlie' },
			]);
		});

		it('filters users by filter string (case-insensitive)', async () => {
			const request = vi.fn(() => ({
				ocs: { data: { users: ['alice', 'bob', 'Alex'] } },
			}));
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'admin',
					password: 'admin',
				})),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getUsers.call(ctx, 'al');

			expect(result.results.map((r) => r.name)).toEqual(['alice', 'Alex']);
		});

		it('fetches all pages of users before filtering', async () => {
			const firstPageUsers = Array.from({ length: 200 }, (_, index) => `user${index + 1}`);
			const request = vi
				.fn()
				.mockResolvedValueOnce({ ocs: { data: { users: firstPageUsers } } })
				.mockResolvedValueOnce({ ocs: { data: { users: ['charlie'] } } });
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'admin',
					password: 'admin',
				})),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getUsers.call(ctx);

			expect(result.results).toHaveLength(201);
			expect(result.results[0]).toEqual({ name: 'user1', value: 'user1' });
			expect(result.results[200]).toEqual({ name: 'charlie', value: 'charlie' });
			expect(request).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ url: expect.stringContaining('limit=200&offset=0') }),
			);
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ url: expect.stringContaining('limit=200&offset=200') }),
			);
		});

		it('returns { results: [] } when credentials are null', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getUsers.call(ctx);

			expect(result).toEqual({ results: [] });
		});

		it('propagates API failures', async () => {
			const request = vi.fn(() => {
				throw new Error('network down');
			});
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => ({
					webDavUrl,
					user: 'admin',
					password: 'admin',
				})),
				helpers: { request, httpRequest: vi.fn() },
			});

			await expect(getUsers.call(ctx)).rejects.toThrow('network down');
		});
	});
});
