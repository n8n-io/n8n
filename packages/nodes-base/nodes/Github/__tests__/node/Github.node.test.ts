import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import nock from 'nock';

import * as utilities from '../../../../utils/utilities';
import { Github } from '../../Github.node';

describe('Test Github Node', () => {
	describe('Workflow Dispatch', () => {
		const now = 1683028800000;
		const owner = 'testOwner';
		const repository = 'testRepository';
		const workflowId = 147025216;
		const usersResponse = {
			total_count: 12,
			items: [
				{
					login: 'testOwner',
					id: 1,
				},
			],
		};
		const repositoriesResponse = {
			total_count: 40,
			items: [
				{
					id: 3081286,
					name: 'testRepository',
				},
			],
		};
		const workflowsResponse = {
			total_count: 2,
			workflows: [
				{
					id: workflowId,
					node_id: 'MDg6V29ya2Zsb3cxNjEzMzU=',
					name: 'CI',
					path: '.github/workflows/blank.yaml',
					state: 'active',
					created_at: '2020-01-08T23:48:37.000-08:00',
					updated_at: '2020-01-08T23:50:21.000-08:00',
					url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335',
					html_url: 'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335',
					badge_url: 'https://github.com/octo-org/octo-repo/workflows/CI/badge.svg',
				},
				{
					id: 269289,
					node_id: 'MDE4OldvcmtmbG93IFNlY29uZGFyeTI2OTI4OQ==',
					name: 'Linter',
					path: '.github/workflows/linter.yaml',
					state: 'active',
					created_at: '2020-01-08T23:48:37.000-08:00',
					updated_at: '2020-01-08T23:50:21.000-08:00',
					url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/269289',
					html_url: 'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/269289',
					badge_url: 'https://github.com/octo-org/octo-repo/workflows/Linter/badge.svg',
				},
			],
		};

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'], now });
		});

		describe('removeTrailingSlash Function', () => {
			let githubNode: Github;
			let mockExecutionContext: any;

			beforeEach(() => {
				githubNode = new Github();
				mockExecutionContext = {
					getNode: jest.fn().mockReturnValue({ name: 'Github' }),
					getNodeParameter: jest.fn(),
					getInputData: jest.fn().mockReturnValue([{ json: {} }]),
					continueOnFail: jest.fn().mockReturnValue(false),
					getCredentials: jest.fn().mockResolvedValue({
						server: 'https://api.github.com',
						user: 'test',
						accessToken: 'test',
					}),
					helpers: {
						returnJsonArray: jest.fn().mockReturnValue([{ json: {} }]),
						requestWithAuthentication: jest.fn().mockResolvedValue({}),
						constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
					},
				};

				jest.spyOn(utilities, 'removeTrailingSlash');
				jest.mock('../../../../utils/utilities', () => ({
					...jest.requireActual('../../../../utils/utilities'),
					getFileSha: jest.fn().mockResolvedValue('mockedSHA'),
				}));
			});

			it('should call remove trailing slash', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'operation') {
						return 'list';
					}
					if (parameterName === 'resource') {
						return 'file';
					}
					if (parameterName === 'filePath') {
						return 'path/to/file/';
					}
					if (parameterName === 'owner') {
						return 'me';
					}
					if (parameterName === 'repository') {
						return 'repo';
					}
					return '';
				});

				await githubNode.execute.call(mockExecutionContext);

				expect(utilities.removeTrailingSlash).toHaveBeenCalledWith('path/to/file/');
				expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'githubOAuth2Api',
					{
						body: {},
						headers: { 'User-Agent': 'n8n' },
						json: true,
						method: 'GET',
						qs: {},
						uri: 'https://api.github.com/repos/me/repo/contents/path%2Fto%2Ffile',
					},
				);
			});
		});

		beforeEach(async () => {
			const baseUrl = 'https://api.github.com';
			nock(baseUrl)
				.persist()
				.defaultReplyHeaders({ 'Content-Type': 'application/json' })
				.get('/search/users')
				.query(true)
				.reply(200, usersResponse)
				.get('/search/repositories')
				.query(true)
				.reply(200, repositoriesResponse)
				.get(`/repos/${owner}/${repository}/actions/workflows`)
				.reply(200, workflowsResponse)
				.post(`/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`, {
					ref: 'main',
					inputs: {},
				})
				.reply(200, {});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['GithubTestWorkflow.json'],
		});
	});

	describe('Error Handling', () => {
		let githubNode: Github;
		let mockExecutionContext: any;

		beforeEach(() => {
			githubNode = new Github();
			mockExecutionContext = {
				getNode: jest.fn().mockReturnValue({ name: 'Github' }),
				getNodeParameter: jest.fn(),
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				continueOnFail: jest.fn().mockReturnValue(false),
				putExecutionToWait: jest.fn(),
				getCredentials: jest.fn().mockResolvedValue({
					server: 'https://api.github.com',
					user: 'test',
					accessToken: 'test',
				}),
				helpers: {
					returnJsonArray: jest.fn().mockReturnValue([{ json: {} }]),
					httpRequest: jest.fn(),
					httpRequestWithAuthentication: jest.fn(),
					requestWithAuthentication: jest
						.fn()
						.mockImplementation(async (_credentialType, options) => {
							if (options.uri.includes('dispatches') && options.method === 'POST') {
								const error: any = new Error('Not Found');
								error.statusCode = 404;
								error.message = 'Not Found';
								throw error;
							}
							return {};
						}),
					request: jest.fn(),
					constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
					assertBinaryData: jest.fn(),
					prepareBinaryData: jest.fn(),
				},
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: {
						resumeUrl: 'https://example.com/webhook',
					},
				}),
			};
		});

		it('should throw NodeOperationError for invalid JSON inputs', async () => {
			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'inputs') {
					return 'invalid json';
				}
				if (parameterName === 'resource') {
					return 'workflow';
				}
				if (parameterName === 'operation') {
					return 'dispatchAndWait';
				}
				if (parameterName === 'authentication') {
					return 'accessToken';
				}
				return '';
			});

			await expect(async () => {
				await githubNode.execute.call(mockExecutionContext);
			}).rejects.toThrow(NodeOperationError);
		});

		it('should throw NodeOperationError for 404 errors when dispatching a workflow', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.helpers.requestWithAuthentication.mockRejectedValueOnce({
				statusCode: 404,
				message: 'Not Found',
			});

			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'owner') {
					return owner;
				}
				if (parameterName === 'repository') {
					return repository;
				}
				if (parameterName === 'workflowId') {
					return workflowId;
				}
				if (parameterName === 'inputs') {
					return '{}';
				}
				if (parameterName === 'ref') {
					return 'main';
				}
				if (parameterName === 'resource') {
					return 'workflow';
				}
				if (parameterName === 'operation') {
					return 'dispatchAndWait';
				}
				if (parameterName === 'authentication') {
					return 'accessToken';
				}
				return '';
			});

			await expect(async () => {
				await githubNode.execute.call(mockExecutionContext);
			}).rejects.toThrow(/The workflow to dispatch could not be found/);
		});

		it('should throw NodeApiError for general API errors', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.helpers.requestWithAuthentication.mockRejectedValueOnce({
				statusCode: 500,
				message: 'Internal Server Error',
			});

			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'owner') {
					return owner;
				}
				if (parameterName === 'repository') {
					return repository;
				}
				if (parameterName === 'workflowId') {
					return workflowId;
				}
				if (parameterName === 'inputs') {
					return '{}';
				}
				if (parameterName === 'ref') {
					return 'main';
				}
				if (parameterName === 'resource') {
					return 'workflow';
				}
				if (parameterName === 'operation') {
					return 'dispatch';
				}
				if (parameterName === 'authentication') {
					return 'accessToken';
				}
				return '';
			});

			await expect(async () => {
				await githubNode.execute.call(mockExecutionContext);
			}).rejects.toThrow();
		});

		it('should throw NodeApiError for general API errors in dispatchAndWait operation', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.getWorkflowDataProxy = jest.fn().mockReturnValue({
				$execution: {
					resumeUrl: 'https://example.com/webhook',
				},
			});

			mockExecutionContext.helpers.requestWithAuthentication.mockRejectedValueOnce({
				statusCode: 500,
				message: 'Internal Server Error',
			});

			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'owner') {
					return owner;
				}
				if (parameterName === 'repository') {
					return repository;
				}
				if (parameterName === 'workflowId') {
					return workflowId;
				}
				if (parameterName === 'inputs') {
					return '{}';
				}
				if (parameterName === 'ref') {
					return 'main';
				}
				if (parameterName === 'resource') {
					return 'workflow';
				}
				if (parameterName === 'operation') {
					return 'dispatchAndWait';
				}
				if (parameterName === 'authentication') {
					return 'accessToken';
				}
				return '';
			});

			await expect(async () => {
				await githubNode.execute.call(mockExecutionContext);
			}).rejects.toThrow(NodeApiError);

			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					uri: expect.stringContaining(
						`/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`,
					),
					body: expect.objectContaining({
						ref: 'main',
						inputs: expect.objectContaining({
							resumeUrl: 'https://example.com/webhook',
						}),
					}),
				}),
			);
		});
	});

	describe('Workflow Operations', () => {
		let githubNode: Github;
		let mockExecutionContext: any;

		beforeEach(() => {
			githubNode = new Github();
			mockExecutionContext = {
				getNode: jest.fn().mockReturnValue({ name: 'Github' }),
				getNodeParameter: jest.fn(),
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				continueOnFail: jest.fn().mockReturnValue(false),
				getCredentials: jest.fn().mockResolvedValue({
					server: 'https://api.github.com',
					user: 'test',
					accessToken: 'test',
				}),
				helpers: {
					returnJsonArray: jest.fn().mockReturnValue([{ json: {} }]),
					requestWithAuthentication: jest.fn().mockResolvedValue({}),
					constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
				},
			};
		});

		it('should use extractValue for workflowId in disable operation', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue: string, options?: any) => {
					if (parameterName === 'owner') {
						return owner;
					}
					if (parameterName === 'repository') {
						return repository;
					}
					if (parameterName === 'workflowId') {
						expect(options).toBeDefined();
						expect(options.extractValue).toBe(true);
						return workflowId;
					}
					if (parameterName === 'resource') {
						return 'workflow';
					}
					if (parameterName === 'operation') {
						return 'disable';
					}
					if (parameterName === 'authentication') {
						return 'accessToken';
					}
					return defaultValue;
				},
			);

			await githubNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PUT',
					uri: `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflowId}/disable`,
				}),
			);
		});

		it('should use extractValue for workflowId in enable operation', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue: string, options?: any) => {
					if (parameterName === 'owner') {
						return owner;
					}
					if (parameterName === 'repository') {
						return repository;
					}
					if (parameterName === 'workflowId') {
						expect(options).toBeDefined();
						expect(options.extractValue).toBe(true);
						return workflowId;
					}
					if (parameterName === 'resource') {
						return 'workflow';
					}
					if (parameterName === 'operation') {
						return 'enable';
					}
					if (parameterName === 'authentication') {
						return 'accessToken';
					}
					return defaultValue;
				},
			);

			await githubNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PUT',
					uri: `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflowId}/enable`,
				}),
			);
		});

		it('should use extractValue for workflowId in get operation', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue: string, options?: any) => {
					if (parameterName === 'owner') {
						return owner;
					}
					if (parameterName === 'repository') {
						return repository;
					}
					if (parameterName === 'workflowId') {
						expect(options).toBeDefined();
						expect(options.extractValue).toBe(true);
						return workflowId;
					}
					if (parameterName === 'resource') {
						return 'workflow';
					}
					if (parameterName === 'operation') {
						return 'get';
					}
					if (parameterName === 'authentication') {
						return 'accessToken';
					}
					return defaultValue;
				},
			);

			await githubNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
					uri: `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflowId}`,
				}),
			);
		});

		it('should use extractValue for workflowId in getUsage operation', async () => {
			const owner = 'testOwner';
			const repository = 'testRepository';
			const workflowId = 147025216;

			mockExecutionContext.getNodeParameter.mockImplementation(
				(parameterName: string, _itemIndex: number, defaultValue: string, options?: any) => {
					if (parameterName === 'owner') {
						return owner;
					}
					if (parameterName === 'repository') {
						return repository;
					}
					if (parameterName === 'workflowId') {
						expect(options).toBeDefined();
						expect(options.extractValue).toBe(true);
						return workflowId;
					}
					if (parameterName === 'resource') {
						return 'workflow';
					}
					if (parameterName === 'operation') {
						return 'getUsage';
					}
					if (parameterName === 'authentication') {
						return 'accessToken';
					}
					return defaultValue;
				},
			);

			await githubNode.execute.call(mockExecutionContext);

			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
					uri: `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflowId}/timing`,
				}),
			);
		});
	});

	describe('Parameter Extraction', () => {
		it('should use extractValue for workflowId parameter', () => {
			const githubNode = new Github();
			const description = githubNode.description;

			const workflowIdParam = description.properties.find((prop) => prop.name === 'workflowId');

			expect(workflowIdParam).toBeDefined();
			expect(workflowIdParam?.type).toBe('resourceLocator');

			const workflowOperations = description.properties.find(
				(prop) =>
					prop.name === 'operation' && prop.displayOptions?.show?.resource?.includes('workflow'),
			);

			expect(workflowOperations).toBeDefined();
			expect(workflowOperations?.options).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 'disable' }),
					expect.objectContaining({ value: 'dispatch' }),
					expect.objectContaining({ value: 'enable' }),
					expect.objectContaining({ value: 'get' }),
					expect.objectContaining({ value: 'getUsage' }),
				]),
			);
		});
	});

	describe('User Operations', () => {
		let githubNode: Github;
		let mockExecutionContext: any;

		beforeEach(() => {
			githubNode = new Github();
			mockExecutionContext = {
				getNode: jest.fn().mockReturnValue({ name: 'Github' }),
				getNodeParameter: jest.fn(),
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				continueOnFail: jest.fn().mockReturnValue(false),
				getCredentials: jest.fn().mockResolvedValue({
					server: 'https://api.github.com',
					user: 'test',
					accessToken: 'test',
				}),
				helpers: {
					returnJsonArray: jest.fn().mockReturnValue([{ json: {} }]),
					requestWithAuthentication: jest.fn().mockResolvedValue({}),
					constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
				},
			};
		});

		it('should fetch open issues by default (user:getIssues)', async () => {
			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'resource') return 'user';
				if (parameterName === 'operation') return 'getUserIssues';
				if (parameterName === 'getUserIssuesFilters') return {};
				if (parameterName === 'returnAll') return true;
				if (parameterName === 'authentication') return 'accessToken';
				return '';
			});
			mockExecutionContext.helpers.requestWithAuthentication.mockResolvedValue({
				body: [
					{ id: 1, title: 'Issue 1', state: 'open' },
					{ id: 2, title: 'Issue 2', state: 'open' },
				],
				headers: {},
			});

			await githubNode.execute.call(mockExecutionContext);
			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/issues',
					qs: expect.not.objectContaining({ state: 'closed' }),
				}),
			);
		});

		it('should fetch closed issues when state filter is set to closed (user:getIssues)', async () => {
			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'resource') return 'user';
				if (parameterName === 'operation') return 'getUserIssues';
				if (parameterName === 'getUserIssuesFilters') return { state: 'closed' };
				if (parameterName === 'returnAll') return true;
				if (parameterName === 'authentication') return 'accessToken';
				return '';
			});

			mockExecutionContext.helpers.requestWithAuthentication.mockResolvedValue({
				body: [{ id: 3, title: 'Issue 3', state: 'closed' }],
				headers: {},
			});

			await githubNode.execute.call(mockExecutionContext);
			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/issues',
					qs: expect.objectContaining({ state: 'closed' }),
				}),
			);
		});

		it('should fetch issues with a specific label (user:getIssues)', async () => {
			mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'resource') return 'user';
				if (parameterName === 'operation') return 'getUserIssues';
				if (parameterName === 'getUserIssuesFilters') return { labels: 'bug' };
				if (parameterName === 'returnAll') return true;
				if (parameterName === 'authentication') return 'accessToken';
				return '';
			});

			mockExecutionContext.helpers.requestWithAuthentication.mockResolvedValue({
				body: [{ id: 4, title: 'Issue 4', state: 'open', labels: ['bug'] }],
				headers: {},
			});

			await githubNode.execute.call(mockExecutionContext);
			expect(mockExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.github.com/issues',
					qs: expect.objectContaining({ labels: 'bug' }),
				}),
			);
		});
	});
});
