import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestMethods, ILoadOptionsFunctions } from 'n8n-workflow';

import { Jira } from '../Jira.node';

const ISSUE_KEY = 'KEY-1';

jest.mock('../GenericFunctions', () => {
	const originalModule = jest.requireActual('../GenericFunctions');
	return {
		...originalModule,
		jiraSoftwareCloudApiRequest: jest.fn(async function (
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
