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

		it('returns null when getCredentials throws', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getNextCloudContext(ctx);

			expect(result).toBeNull();
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

		it('returns { results: [] } when API throws', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

			const result = await getUsers.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(errorSpy).toHaveBeenCalled();
			errorSpy.mockRestore();
		});
	});
});
