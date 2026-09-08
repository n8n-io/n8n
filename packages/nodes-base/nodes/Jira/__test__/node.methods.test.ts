import type { MockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { IHttpRequestMethods, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { Jira } from '../Jira.node';
import type * as _importType0 from '../GenericFunctions';

const ISSUE_KEY = 'KEY-1';

vi.mock('../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../GenericFunctions');
	return {
		...originalModule,
		jiraSoftwareCloudApiRequest: vi.fn(async function (
			endpoint: string,
			method: IHttpRequestMethods,
		) {
			if (method === 'GET' && endpoint === `/api/2/issue/${ISSUE_KEY}`) {
				return {
					id: 10000,
					fields: {
						project: {
							id: 10001,
						},
						issuetype: {
							id: 10002,
						},
					},
				};
			} else if (method === 'GET' && endpoint === '/api/2/issue/10000/editmeta') {
				return {
					fields: {
						customfield_123: {
							name: 'Field 123',
						},
						customfield_456: {
							name: 'Field 456',
						},
					},
				};
			} else if (
				method === 'GET' &&
				endpoint ===
					'/api/2/issue/createmeta?projectIds=10001&issueTypeIds=10002&expand=projects.issuetypes.fields'
			) {
				return {
					projects: [
						{
							id: 10001,
							issuetypes: [
								{
									id: 10002,
									fields: {
										customfield_abc: {
											name: 'Field ABC',
											schema: { customId: 'customfield_abc' },
											fieldId: 'customfield_abc',
										},
										customfield_def: {
											name: 'Field DEF',
											schema: { customId: 'customfield_def' },
											fieldId: 'customfield_def',
										},
									},
								},
							],
						},
					],
				};
			}
		}),
	};
});

describe('Jira Node, methods', () => {
	let jira: Jira;
	let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		jira = new Jira();
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	describe('listSearch.getSites', () => {
		it('should list the sites the service account can reach', async () => {
			const ctx = mockDeep<ILoadOptionsFunctions>();
			ctx.getNode.mockReturnValue(mock<INode>({ credentials: undefined }));
			ctx.helpers.httpRequestWithAuthentication.mockResolvedValue([
				{ id: 'cloud-2', url: 'https://zeta.atlassian.net', name: 'Zeta' },
				{ id: 'cloud-1', url: 'https://alpha.atlassian.net', name: 'Alpha' },
			]);

			const { results } = await jira.methods.listSearch.getSites.call(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'atlassianServiceAccountApi',
				expect.objectContaining({
					url: 'https://api.atlassian.com/oauth/token/accessible-resources',
				}),
			);
			expect(results).toEqual([
				{ name: 'Alpha', value: 'cloud-1', url: 'https://alpha.atlassian.net' },
				{ name: 'Zeta', value: 'cloud-2', url: 'https://zeta.atlassian.net' },
			]);

			const filtered = await jira.methods.listSearch.getSites.call(ctx, 'zeta');
			expect(filtered.results.map((site) => site.value)).toEqual(['cloud-2']);
		});
	});

	describe('listSearch.getCustomFields', () => {
		it('should call correct endpoint and return custom fields for server version', async () => {
			loadOptionsFunctions.getCurrentNodeParameter.mockReturnValueOnce('update');
			loadOptionsFunctions.getNodeParameter.mockReturnValue('server');
			loadOptionsFunctions.getCurrentNodeParameter.mockReturnValueOnce(ISSUE_KEY);

			const { results } = await jira.methods.listSearch.getCustomFields.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(results).toEqual([
				{
					name: 'Field 123',
					value: 'customfield_123',
				},
				{
					name: 'Field 456',
					value: 'customfield_456',
				},
			]);
		});

		it('should call correct endpoint and return custom fields for cloud version', async () => {
			loadOptionsFunctions.getCurrentNodeParameter.mockReturnValueOnce('update');
			loadOptionsFunctions.getNodeParameter.mockReturnValue('cloud');
			loadOptionsFunctions.getCurrentNodeParameter.mockReturnValueOnce(ISSUE_KEY);

			const { results } = await jira.methods.listSearch.getCustomFields.call(
				loadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(results).toEqual([
				{
					name: 'Field ABC',
					value: 'customfield_abc',
				},
				{
					name: 'Field DEF',
					value: 'customfield_def',
				},
			]);
		});
	});
});
