import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Jira } from '../Jira.node';

jest.mock('../GenericFunctions', () => ({
	jiraSoftwareCloudApiRequest: jest.fn().mockResolvedValue({ issues: [] }),
	jiraSoftwareCloudApiRequestAllItems: jest.fn().mockResolvedValue([]),
}));

const jiraSoftwareCloudApiRequestMock = GenericFunctions.jiraSoftwareCloudApiRequest as jest.Mock;
const jiraSoftwareCloudApiRequestAllItems =
	GenericFunctions.jiraSoftwareCloudApiRequestAllItems as jest.Mock;

describe('Jira Node', () => {
	let jiraNode: Jira;
	let executeFunctionsMock: DeepMockProxy<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		jiraNode = new Jira();
		executeFunctionsMock = mockDeep<IExecuteFunctions>();
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.helpers.returnJsonArray.mockReturnValue([]);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockReturnValue([]);
	});

	describe('issue getAll', () => {
		it('should set default fields to "*navigable" when not provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'getAll';
					case 'jiraVersion':
						return 'cloud';
					case 'returnAll':
						return false;
					case 'limit':
						return 10;
					case 'options':
						return { fields: undefined };
					default:
						return null;
				}
			});

			await jiraNode.execute.call(executeFunctionsMock);

			expect(jiraSoftwareCloudApiRequestMock).toHaveBeenCalledWith(
				'/api/2/search/jql',
				'POST',
				expect.objectContaining({
					fields: ['*navigable'],
				}),
			);
		});

		it('should set default JQL filter to "created >= 1970-01-01" when not provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'getAll';
					case 'jiraVersion':
						return 'cloud';
					case 'returnAll':
						return false;
					case 'limit':
						return 10;
					case 'options':
						return { jql: undefined };
					default:
						return null;
				}
			});

			await jiraNode.execute.call(executeFunctionsMock);

			expect(jiraSoftwareCloudApiRequestMock).toHaveBeenCalledWith(
				'/api/2/search/jql',
				'POST',
				expect.objectContaining({
					jql: 'created >= "1970-01-01"',
				}),
			);
		});

		it('should use custom fields when provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'getAll';
					case 'jiraVersion':
						return 'cloud';
					case 'returnAll':
						return false;
					case 'limit':
						return 10;
					case 'options':
						return { fields: 'summary,description' };
					default:
						return null;
				}
			});

			await jiraNode.execute.call(executeFunctionsMock);

			expect(jiraSoftwareCloudApiRequestMock).toHaveBeenCalledWith(
				'/api/2/search/jql',
				'POST',
				expect.objectContaining({
					fields: ['summary', 'description'],
				}),
			);
		});

		it('should use custom JQL filter when provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'getAll';
					case 'jiraVersion':
						return 'cloud';
					case 'returnAll':
						return false;
					case 'limit':
						return 10;
					case 'options':
						return { jql: 'project = TEST' };
					default:
						return null;
				}
			});

			await jiraNode.execute.call(executeFunctionsMock);

			expect(jiraSoftwareCloudApiRequestMock).toHaveBeenCalledWith(
				'/api/2/search/jql',
				'POST',
				expect.objectContaining({
					jql: 'project = TEST',
				}),
			);
		});

		it('should call new endpoint for the cloud version with return all = true', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'getAll';
					case 'jiraVersion':
						return 'cloud';
					case 'returnAll':
						return true;
					case 'options':
						return {};
					default:
						return null;
				}
			});

			await jiraNode.execute.call(executeFunctionsMock);

			expect(jiraSoftwareCloudApiRequestAllItems).toHaveBeenCalledWith(
				'issues',
				'/api/2/search/jql',
				'POST',
				expect.anything(),
				{},
				'token',
			);
		});

		it.each([['server'], ['serverPat']])(
			'should call old endpoint for the self-hosted version with return all = false',
			async (jiraVersion: string) => {
				executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'issue';
						case 'operation':
							return 'getAll';
						case 'jiraVersion':
							return jiraVersion;
						case 'returnAll':
							return false;
						case 'limit':
							return 10;
						case 'options':
							return {};
						default:
							return null;
					}
				});

				await jiraNode.execute.call(executeFunctionsMock);

				expect(jiraSoftwareCloudApiRequestMock).toHaveBeenCalledWith(
					'/api/2/search',
					'POST',
					expect.anything(),
				);
			},
		);

		it.each([['server'], ['serverPat']])(
			'should call old endpoint for the self-hosted version with return all = true',
			async (jiraVersion: string) => {
				executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'issue';
						case 'operation':
							return 'getAll';
						case 'jiraVersion':
							return jiraVersion;
						case 'returnAll':
							return true;
						case 'options':
							return {};
						default:
							return null;
					}
				});

				await jiraNode.execute.call(executeFunctionsMock);

				expect(jiraSoftwareCloudApiRequestAllItems).toHaveBeenCalledWith(
					'issues',
					'/api/2/search',
					'POST',
					expect.anything(),
				);
			},
		);
	});
});
