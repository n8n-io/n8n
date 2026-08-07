import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { vi } from 'vitest';

import { Github } from '../Github.node';

/**
 * Build a mock IExecuteFunctions whose getNodeParameter returns the supplied
 * values. Unspecified parameters fall back to the default ('' / 0 / false).
 */
function createMockExecuteFunction(params: Record<string, any>) {
	const merged: Record<string, any> = {
		resource: 'pullRequest',
		authentication: 'accessToken',
		owner: 'test-owner',
		repository: 'test-repo',
		...params,
	};

	const mock = {
		getNodeParameter: vi.fn((paramName: string, _itemIndex?: number, fallback?: any) => {
			return paramName in merged ? merged[paramName] : fallback;
		}),
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getNode: vi.fn().mockReturnValue({
			id: 'test-node-id',
			name: 'Github',
			type: 'n8n-nodes-base.github',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			requestWithAuthentication: vi.fn(),
			returnJsonArray: vi.fn((data: any) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			}),
			constructExecutionMetaData: vi.fn((data: any) => data),
		},
		getCredentials: vi.fn().mockResolvedValue({
			accessToken: 'test-token',
			server: 'https://api.github.com',
		}),
		continueOnFail: vi.fn().mockReturnValue(false),
	};

	return mock as any;
}

/**
 * Build a dummy error object that resembles what the real
 * `requestWithAuthentication` throws when GitHub returns an error.
 * The real `githubApiRequest` will catch this and throw a
 * `NodeApiError` containing the original body.
 */
function makeGithubError(statusCode: number, message: string) {
	return {
		statusCode,
		error: {
			message,
			documentation_url: 'https://docs.github.com/rest',
			status: String(statusCode),
		},
	};
}

describe('Github Node - Pull Request Operations', () => {
	let github: Github;

	beforeEach(() => {
		github = new Github();
		vi.clearAllMocks();
	});

	// -----------------------------------------------------------
	// create
	// -----------------------------------------------------------
	describe('pullRequest:create', () => {
		it('should create a PR with all fields (title, body, head, base, draft=true)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'Add new feature',
				body: 'This is the description',
				head: 'feature-branch',
				base: 'main',
				draft: true,
			});
			// mock the underlying HTTP call
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				number: 1,
				title: 'Add new feature',
				state: 'open',
				draft: true,
			});

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi', // credential name or function - ignore for test
				{
					method: 'POST',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls',
					body: {
						title: 'Add new feature',
						body: 'This is the description',
						head: 'feature-branch',
						base: 'main',
						draft: true,
					},
					json: true,
					qs: {},
				},
			);
			expect(result[0][0].json).toMatchObject({ number: 1, title: 'Add new feature' });
		});

		it('should create a PR with draft=false', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'Ready PR',
				body: 'Body',
				head: 'feat',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 2 });

			await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					body: expect.objectContaining({ draft: false, title: 'Ready PR' }),
				}),
			);
		});

		it('should create a cross-fork PR with `owner:branch` head', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'Cross fork PR',
				body: '',
				head: 'other-user:feature-branch',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 3 });

			await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					body: expect.objectContaining({ head: 'other-user:feature-branch' }),
				}),
			);
		});

		it('should default body to empty string when not provided', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'No body PR',
				// body intentionally absent
				head: 'feat',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 4 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toMatchObject({ body: '', title: 'No body PR' });
		});

		it('should NOT send commit_title or commit_message in the create body', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'No commit fields',
				body: 'desc',
				head: 'feat',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 5 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).not.toHaveProperty('commit_title');
			expect(callArgs.body).not.toHaveProperty('commit_message');
		});

		it('should throw NodeApiError on 422 validation failure', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'Bad PR',
				body: '',
				head: 'nonexistent:branch',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(422, 'No commits between main and feature'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 404 repository not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'PR',
				body: '',
				head: 'feat',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should propagate the original GitHub error body inside the NodeApiError', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'PR',
				body: '',
				head: 'feat',
				base: 'main',
				draft: false,
			});
			const githubErr = makeGithubError(422, 'Validation Failed');
			mock.helpers.requestWithAuthentication.mockRejectedValue(githubErr);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
			await expect(github.execute.call(mock)).rejects.toThrow(
				'Your request is invalid or could not be processed by the service',
			);
		});

		it('should register pullRequest:create in overwriteDataOperations and return one item', async () => {
			const mock = createMockExecuteFunction({
				operation: 'create',
				title: 'PR',
				body: '',
				head: 'feat',
				base: 'main',
				draft: false,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				number: 6,
				title: 'PR',
			});

			const result = await github.execute.call(mock);
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ number: 6, title: 'PR' });
		});
	});

	// -----------------------------------------------------------
	// update
	// -----------------------------------------------------------
	describe('pullRequest:update', () => {
		it('should update title only', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 1,
				editFields: { title: 'New title' },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 1 });

			await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'PATCH',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/1',
					body: { title: 'New title' },
				}),
			);
		});

		it('should update body only', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 2,
				editFields: { body: 'Updated body' },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 2 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ body: 'Updated body' });
		});

		it('should update state to closed', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 3,
				editFields: { state: 'closed' },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 3 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ state: 'closed' });
		});

		it('should update state to open', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 4,
				editFields: { state: 'open' },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 4 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ state: 'open' });
		});

		it('should update base branch', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 5,
				editFields: { base: 'develop' },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 5 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ base: 'develop' });
		});

		it('should update multiple fields simultaneously', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 6,
				editFields: {
					title: 'Multi update',
					body: 'Body text',
					state: 'closed',
					base: 'release',
				},
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 6 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({
				title: 'Multi update',
				body: 'Body text',
				state: 'closed',
				base: 'release',
			});
		});

		it('should still send a request with an empty body when editFields is empty', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 7,
				editFields: {},
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 7 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({});
		});

		it('should NOT send a `draft` field even if it leaks into editFields', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 8,
				editFields: { title: 'New title', draft: true as any },
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 8 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).not.toHaveProperty('draft');
			expect(callArgs.body).toEqual({ title: 'New title' });
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 9999,
				editFields: { title: 'X' },
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 422 when setting an invalid state', async () => {
			const mock = createMockExecuteFunction({
				operation: 'update',
				pullRequestNumber: 10,
				editFields: { state: 'merged' as any },
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(422, 'Validation Failed'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// close
	// -----------------------------------------------------------
	describe('pullRequest:close', () => {
		it('should close an open PR (PATCH with state=closed)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'close',
				pullRequestNumber: 1,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				number: 1,
				state: 'closed',
			});

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'PATCH',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/1',
					body: { state: 'closed' },
				}),
			);
			expect(result[0][0].json).toMatchObject({ number: 1, state: 'closed' });
		});

		it('should throw NodeApiError when PR is already closed (405)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'close',
				pullRequestNumber: 1,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(405, 'Method Not Allowed'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError when PR is already merged (405)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'close',
				pullRequestNumber: 2,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(405, 'Pull Request is already merged'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'close',
				pullRequestNumber: 9999,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// reopen
	// -----------------------------------------------------------
	describe('pullRequest:reopen', () => {
		it('should reopen a closed PR (PATCH with state=open)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'reopen',
				pullRequestNumber: 1,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				number: 1,
				state: 'open',
			});

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'PATCH',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/1',
					body: { state: 'open' },
				}),
			);
			expect(result[0][0].json).toMatchObject({ number: 1, state: 'open' });
		});

		it('should treat a 200 with no state change (PR already open) as success', async () => {
			const mock = createMockExecuteFunction({
				operation: 'reopen',
				pullRequestNumber: 2,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				number: 2,
				state: 'open',
			});

			const result = await github.execute.call(mock);
			expect(result[0][0].json).toMatchObject({ state: 'open' });
		});

		it('should throw NodeApiError when PR is merged (405 – cannot reopen merged)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'reopen',
				pullRequestNumber: 3,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(405, 'Cannot reopen a merged pull request'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'reopen',
				pullRequestNumber: 9999,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// get
	// -----------------------------------------------------------
	describe('pullRequest:get', () => {
		it('should GET the pull request and return it', async () => {
			const pr = { number: 1, title: 'My PR', state: 'open' };
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 1,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue(pr);

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/1',
				}),
			);
			expect(result[0][0].json).toEqual(pr);
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 9999,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// createComment
	// -----------------------------------------------------------
	describe('pullRequest:createComment', () => {
		it('should POST to the /issues/{number}/comments endpoint', async () => {
			const mock = createMockExecuteFunction({
				operation: 'createComment',
				pullRequestNumber: 42,
				body: 'Looks good to me!',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ id: 100 });

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.github.com/repos/test-owner/test-repo/issues/42/comments',
					body: { body: 'Looks good to me!' },
				}),
			);
			expect(result[0][0].json).toEqual({ id: 100 });
		});

		it('should use exactly the /issues/{pullRequestNumber}/comments path', async () => {
			const mock = createMockExecuteFunction({
				operation: 'createComment',
				pullRequestNumber: 7,
				body: 'hello',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ id: 1 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.uri).toBe(
				'https://api.github.com/repos/test-owner/test-repo/issues/7/comments',
			);
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'createComment',
				pullRequestNumber: 9999,
				body: 'hi',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// editComment
	// -----------------------------------------------------------
	describe('pullRequest:editComment', () => {
		it('should PATCH the comment with the new body', async () => {
			const mock = createMockExecuteFunction({
				operation: 'editComment',
				commentId: 555,
				body: 'Edited body',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ id: 555 });

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'PATCH',
					uri: 'https://api.github.com/repos/test-owner/test-repo/issues/comments/555',
					body: { body: 'Edited body' },
				}),
			);
			expect(result[0][0].json).toEqual({ id: 555 });
		});

		it('should use exactly the /issues/comments/{commentId} path', async () => {
			const mock = createMockExecuteFunction({
				operation: 'editComment',
				commentId: 123,
				body: 'b',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ id: 123 });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.uri).toBe(
				'https://api.github.com/repos/test-owner/test-repo/issues/comments/123',
			);
		});

		it('should throw NodeApiError on 404 comment ID not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'editComment',
				commentId: 999999,
				body: 'b',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// getDiff
	// -----------------------------------------------------------
	describe('pullRequest:getDiff', () => {
		it('should GET the raw diff and return it as { diff }', async () => {
			const mock = createMockExecuteFunction({
				operation: 'getDiff',
				pullRequestNumber: 42,
			});
			const rawDiff = 'diff --git a/file b/file\n+added line\n';
			// Mock the raw response from githubApiRequest (which calls requestWithAuthentication internally)
			// For diff, it returns a string, not an object.
			mock.helpers.requestWithAuthentication.mockResolvedValue(rawDiff);

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
					headers: { Accept: 'application/vnd.github.v3.diff' },
					json: false,
				}),
			);
			// The node manually wraps the diff into an object { diff: rawDiff }
			expect(result[0][0].json).toEqual({ diff: rawDiff });
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'getDiff',
				pullRequestNumber: 9999,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// getPatch
	// -----------------------------------------------------------
	describe('pullRequest:getPatch', () => {
		it('should GET the raw patch and return it as { patch }', async () => {
			const mock = createMockExecuteFunction({
				operation: 'getPatch',
				pullRequestNumber: 7,
			});
			const rawPatch =
				'From abc123 Mon Sep 17 00:00:00 2001\n--- a/file\n+++ b/file\n@@ -1 +1,2 @@\n+new line';
			mock.helpers.requestWithAuthentication.mockResolvedValue(rawPatch);

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/7',
					headers: { Accept: 'application/vnd.github.v3.patch' },
					json: false,
				}),
			);
			expect(result[0][0].json).toEqual({ patch: rawPatch });
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'getPatch',
				pullRequestNumber: 9999,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// merge
	// -----------------------------------------------------------
	describe('pullRequest:merge', () => {
		it('should merge a PR normally (200, merged=true)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 1,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				merged: true,
				message: 'PR merged',
				sha: 'abc123',
			});

			const result = await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'PUT',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/1/merge',
					body: { merge_method: 'merge' },
				}),
			);
			expect(result[0][0].json).toMatchObject({ merged: true, sha: 'abc123' });
		});

		it('should merge with merge_method=squash', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 1,
				mergeMethod: 'squash',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ merged: true });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ merge_method: 'squash' });
		});

		it('should merge with merge_method=rebase', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 2,
				mergeMethod: 'rebase',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ merged: true });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({ merge_method: 'rebase' });
		});

		it('should accept merge-queue (202 Accepted, merged=false)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 3,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({
				merged: false,
				message: 'Pull Request successfully enqueued for merging',
			});

			const result = await github.execute.call(mock);

			expect(result[0][0].json).toMatchObject({ merged: false });
		});

		it('should include commit_title and commit_message when provided', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 4,
				mergeMethod: 'merge',
				commitTitle: 'My custom title',
				commitMessage: 'My custom message',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ merged: true });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).toEqual({
				commit_title: 'My custom title',
				commit_message: 'My custom message',
				merge_method: 'merge',
			});
		});

		it('should NOT send commit_title or commit_message when they are empty strings', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 5,
				mergeMethod: 'merge',
				commitTitle: '   ',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ merged: true });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).not.toHaveProperty('commit_title');
			expect(callArgs.body).not.toHaveProperty('commit_message');
			expect(callArgs.body).toEqual({ merge_method: 'merge' });
		});

		it('should NOT send a `sha` parameter (the field was intentionally removed)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 6,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ merged: true });

			await github.execute.call(mock);

			const callArgs = mock.helpers.requestWithAuthentication.mock.calls[0][1] as {
				body: Record<string, any>;
				uri?: string;
				headers?: Record<string, string>;
				json?: boolean;
			};
			expect(callArgs.body).not.toHaveProperty('sha');
		});

		it('should throw NodeApiError on 405 merge conflict', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 7,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(405, 'Merge conflict'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError when PR is already merged (405)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 8,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(405, 'Pull Request is already merged'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 404 PR not found', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 9999,
				mergeMethod: 'merge',
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(makeGithubError(404, 'Not Found'));

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});

		it('should throw NodeApiError on 422 invalid merge method', async () => {
			const mock = createMockExecuteFunction({
				operation: 'merge',
				pullRequestNumber: 10,
				mergeMethod: 'invalid-method' as any,
				commitTitle: '',
				commitMessage: '',
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(422, 'Validation Failed'),
			);

			await expect(github.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	// -----------------------------------------------------------
	// Cross-cutting concerns
	// -----------------------------------------------------------
	describe('cross-cutting concerns', () => {
		it.each([
			'pullRequest:create',
			'pullRequest:update',
			'pullRequest:close',
			'pullRequest:reopen',
			'pullRequest:get',
			'pullRequest:createComment',
			'pullRequest:editComment',
			'pullRequest:merge',
			'pullRequest:getDiff',
			'pullRequest:getPatch',
		])('should register %s in overwriteDataOperations', async (fullOp) => {
			const [, op] = fullOp.split(':');
			const mock = createMockExecuteFunction({ operation: op });
			mock.helpers.requestWithAuthentication.mockResolvedValue(
				op === 'getDiff' ? 'diff' : op === 'getPatch' ? 'patch' : { ok: true },
			);

			const result = await github.execute.call(mock);
			// Overwrite operations replace the input items
			expect(result[0]).toHaveLength(1);
			if (op === 'getDiff') {
				expect(result[0][0].json).toEqual({ diff: 'diff' });
			} else if (op === 'getPatch') {
				expect(result[0][0].json).toEqual({ patch: 'patch' });
			} else {
				expect(result[0][0].json).toEqual({ ok: true });
			}
		});

		it('should treat the resource as string (not narrow to union and drop "pullRequest")', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 5,
			});
			mock.helpers.requestWithAuthentication.mockResolvedValue({ number: 5 });

			await github.execute.call(mock);

			expect(mock.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/repos/test-owner/test-repo/pulls/5',
				}),
			);
		});

		it('should re-throw API errors as NodeApiError (not NodeOperationError)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 1,
			});
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(500, 'Internal Server Error'),
			);

			let caught: unknown;
			try {
				await github.execute.call(mock);
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(NodeApiError);
			expect(caught).not.toBeInstanceOf(NodeOperationError);
		});

		it('should preserve the original GitHub error body inside NodeApiError', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 1,
			});
			const rawError = makeGithubError(404, 'Not Found');
			mock.helpers.requestWithAuthentication.mockRejectedValue(rawError);

			try {
				await github.execute.call(mock);
				throw new Error('Expected execute to throw');
			} catch (error) {
				const apiError = error as NodeApiError;
				// The serialized NodeApiError must surface the original GitHub
				// message and status code.
				expect(apiError.message).toContain('The resource you are requesting could not be found');
			}
		});

		it('should not invoke the API when continueOnFail=true and the call rejects (PR get)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				pullRequestNumber: 1,
			});
			mock.continueOnFail.mockReturnValue(true);
			mock.helpers.requestWithAuthentication.mockRejectedValue(
				makeGithubError(500, 'Internal Server Error'),
			);

			const result = await github.execute.call(mock);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({
				error: 'The service was not able to process your request',
			});
		});
	});
});
