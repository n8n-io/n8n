import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { describe, it, expect, vi } from 'vitest';

import { getBoards, getStacks, getCards, getLabels } from '../Deck/deckSearchFunctions';

function createMockLoadOptionsFunctions(
	overrides?: Partial<ILoadOptionsFunctions>,
): ILoadOptionsFunctions {
	return {
		getCredentials: vi.fn() as unknown as ILoadOptionsFunctions['getCredentials'],
		getCurrentNodeParameter: vi.fn(),
		helpers: {
			request: vi.fn(),
			httpRequest: vi.fn(),
			httpRequestWithAuthentication: vi.fn(),
			requestWithAuthenticationPaginated: vi.fn(),
			requestWithAuthentication: vi.fn(),
			requestOAuth1: vi.fn(),
			requestOAuth2: vi.fn(),
		} as unknown as ILoadOptionsFunctions['helpers'],
		...overrides,
	} as unknown as ILoadOptionsFunctions;
}

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';
const baseUrl = 'https://nextcloud.example.com';
const deckBase = `${baseUrl}/index.php/apps/deck/api/v1.1`;

function credsContext(overrides?: Record<string, unknown>): ILoadOptionsFunctions {
	return createMockLoadOptionsFunctions({
		getCurrentNodeParameter: vi.fn(() => 'accessToken'),
		getCredentials: vi.fn(() => ({
			webDavUrl,
			user: 'admin',
			password: 'admin',
		})),
		...overrides,
	} as unknown as Partial<ILoadOptionsFunctions>);
}

describe('NextCloud Deck deckSearchFunctions', () => {
	describe('getBoards', () => {
		it('returns mapped boards from Deck API', async () => {
			const httpRequest = vi.fn(() => [
				{ id: 1, title: 'Personal' },
				{ id: 2, title: 'Work' },
			]);
			const ctx = credsContext({
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getBoards.call(ctx);

			expect(result.results).toEqual([
				{ name: 'Personal', value: '1' },
				{ name: 'Work', value: '2' },
			]);
			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: `${deckBase}/boards` }),
			);
		});

		it('filters by filter string (case-insensitive)', async () => {
			const httpRequest = vi.fn(() => [
				{ id: 1, title: 'Personal' },
				{ id: 2, title: 'Work' },
				{ id: 3, title: 'PERSONAL backup' },
			]);
			const ctx = credsContext({
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getBoards.call(ctx, 'personal');

			expect(result.results.map((r) => r.name)).toEqual(['Personal', 'PERSONAL backup']);
		});

		it('returns { results: [] } when credentials are null', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn(() => 'accessToken'),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getBoards.call(ctx);

			expect(result).toEqual({ results: [] });
		});

		it('returns { results: [] } when API throws', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const httpRequest = vi.fn(() => {
				throw new Error('boom');
			});
			const ctx = credsContext({
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getBoards.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(errorSpy).toHaveBeenCalled();
			errorSpy.mockRestore();
		});
	});

	describe('getStacks', () => {
		it('returns stacks for selected board', async () => {
			const httpRequest = vi.fn(() => [
				{ id: 10, title: 'To Do' },
				{ id: 20, title: 'Doing' },
			]);
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					return undefined;
				}),
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getStacks.call(ctx);

			expect(result.results).toEqual([
				{ name: 'To Do', value: '10' },
				{ name: 'Doing', value: '20' },
			]);
			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: `${deckBase}/boards/5/stacks` }),
			);
		});

		it('reads boardId from getCurrentNodeParameter', async () => {
			const httpRequest = vi.fn(() => []);
			const getCurrentNodeParameter = vi.fn((name: string) => {
				if (name === 'boardId') return '42';
				return undefined;
			});
			const ctx = credsContext({
				getCurrentNodeParameter,
				helpers: { request: vi.fn(), httpRequest },
			});

			await getStacks.call(ctx);

			expect(getCurrentNodeParameter).toHaveBeenCalledWith('boardId', { extractValue: true });
		});

		it('returns { results: [] } when boardId is missing', async () => {
			const httpRequest = vi.fn();
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn(() => undefined),
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getStacks.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('returns { results: [] } when credentials are null', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					return undefined;
				}),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getStacks.call(ctx);

			expect(result).toEqual({ results: [] });
		});
	});

	describe('getCards', () => {
		it('returns cards extracted from stack response (stack.cards)', async () => {
			const request = vi.fn(() => ({
				id: 7,
				title: 'To Do',
				cards: [
					{ id: 100, title: 'Card A' },
					{ id: 101, title: 'Card B' },
				],
			}));
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					if (name === 'stackId') return '7';
					return undefined;
				}),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getCards.call(ctx);

			expect(result.results).toEqual([
				{ name: 'Card A', value: '100' },
				{ name: 'Card B', value: '101' },
			]);
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({ url: `${deckBase}/boards/5/stacks/7` }),
			);
		});

		it('reads boardId and stackId from parameters', async () => {
			const request = vi.fn(() => ({ cards: [] }));
			const getCurrentNodeParameter = vi.fn((name: string) => {
				if (name === 'boardId') return '9';
				if (name === 'stackId') return '11';
				return undefined;
			});
			const ctx = credsContext({
				getCurrentNodeParameter,
				helpers: { request, httpRequest: vi.fn() },
			});

			await getCards.call(ctx);

			expect(getCurrentNodeParameter).toHaveBeenCalledWith('boardId', { extractValue: true });
			expect(getCurrentNodeParameter).toHaveBeenCalledWith('stackId', { extractValue: true });
		});

		it('returns { results: [] } when boardId is missing', async () => {
			const request = vi.fn();
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'stackId') return '7';
					return undefined;
				}),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getCards.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(request).not.toHaveBeenCalled();
		});

		it('returns { results: [] } when stackId is missing', async () => {
			const request = vi.fn();
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					return undefined;
				}),
				helpers: { request, httpRequest: vi.fn() },
			});

			const result = await getCards.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(request).not.toHaveBeenCalled();
		});

		it('returns { results: [] } when credentials are null', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					if (name === 'stackId') return '7';
					return undefined;
				}),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getCards.call(ctx);

			expect(result).toEqual({ results: [] });
		});
	});

	describe('getLabels', () => {
		it('returns labels extracted from board response (board.labels)', async () => {
			const httpRequest = vi.fn(() => ({
				id: 5,
				title: 'Personal',
				labels: [
					{ id: 1, title: 'bug' },
					{ id: 2, title: 'feature' },
				],
			}));
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					return undefined;
				}),
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getLabels.call(ctx);

			expect(result.results).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'bug', value: '1' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'feature', value: '2' },
			]);
			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: `${deckBase}/boards/5` }),
			);
		});

		it('reads boardId from parameters', async () => {
			const httpRequest = vi.fn(() => ({ labels: [] }));
			const getCurrentNodeParameter = vi.fn((name: string) => {
				if (name === 'boardId') return '12';
				return undefined;
			});
			const ctx = credsContext({
				getCurrentNodeParameter,
				helpers: { request: vi.fn(), httpRequest },
			});

			await getLabels.call(ctx);

			expect(getCurrentNodeParameter).toHaveBeenCalledWith('boardId', { extractValue: true });
		});

		it('returns { results: [] } when boardId is missing', async () => {
			const httpRequest = vi.fn();
			const ctx = credsContext({
				getCurrentNodeParameter: vi.fn(() => undefined),
				helpers: { request: vi.fn(), httpRequest },
			});

			const result = await getLabels.call(ctx);

			expect(result).toEqual({ results: [] });
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it('returns { results: [] } when credentials are null', async () => {
			const ctx = createMockLoadOptionsFunctions({
				getCurrentNodeParameter: vi.fn((name: string) => {
					if (name === 'boardId') return '5';
					return undefined;
				}),
				getCredentials: vi.fn(() => {
					throw new Error('no creds');
				}),
			});

			const result = await getLabels.call(ctx);

			expect(result).toEqual({ results: [] });
		});
	});
});
