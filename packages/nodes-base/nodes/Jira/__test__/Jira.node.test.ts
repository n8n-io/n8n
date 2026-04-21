import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

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

	describe('continueOnFail', () => {
		it('should return error item when API request fails and continueOnFail is true', async () => {
			const errorMessage = 'Issue does not exist';
			jiraSoftwareCloudApiRequestMock.mockRejectedValueOnce(new Error(errorMessage));
			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			executeFunctionsMock.helpers.returnJsonArray.mockImplementation(
				(data: IDataObject | IDataObject[]) =>
					[{ json: data as IDataObject }] as INodeExecutionData[],
			);
			executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
				(items) =>
					items as unknown as ReturnType<
						typeof executeFunctionsMock.helpers.constructExecutionMetaData
					>,
			);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'get';
					case 'jiraVersion':
						return 'cloud';
					case 'issueKey':
						return 'TEST-123';
					case 'simplifyOutput':
						return false;
					case 'additionalFields':
						return {};
					default:
						return null;
				}
			});

			const result = await jiraNode.execute.call(executeFunctionsMock);

			expect(result).toEqual([[{ json: { error: errorMessage } }]]);
		});

		it('should throw when API request fails and continueOnFail is false', async () => {
			const error = new Error('Issue does not exist');
			jiraSoftwareCloudApiRequestMock.mockRejectedValueOnce(error);
			executeFunctionsMock.continueOnFail.mockReturnValue(false);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'get';
					case 'jiraVersion':
						return 'cloud';
					case 'issueKey':
						return 'TEST-123';
					case 'simplifyOutput':
						return false;
					case 'additionalFields':
						return {};
					default:
						return null;
				}
			});

			await expect(jiraNode.execute.call(executeFunctionsMock)).rejects.toThrow(
				'Issue does not exist',
			);
		});

		it('should return error item with preserved paired-item metadata when attachment download fails', async () => {
			const attachmentMeta = {
				id: '10001',
				filename: 'file.txt',
				mimeType: 'text/plain',
				content: 'https://jira.example.com/attachments/10001',
			};
			jiraSoftwareCloudApiRequestMock
				.mockResolvedValueOnce(attachmentMeta)
				.mockRejectedValueOnce(new Error('Download failed'));

			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			executeFunctionsMock.helpers.returnJsonArray.mockImplementation(
				(data: IDataObject | IDataObject[]) =>
					[{ json: data as IDataObject }] as INodeExecutionData[],
			);
			executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
				(items, { itemData }) =>
					items.map((item) => ({
						...item,
						pairedItem: itemData,
					})) as unknown as ReturnType<
						typeof executeFunctionsMock.helpers.constructExecutionMetaData
					>,
			);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issueAttachment';
					case 'operation':
						return 'get';
					case 'jiraVersion':
						return 'cloud';
					case 'attachmentId':
						return '10001';
					case 'download':
						return true;
					case 'binaryProperty':
						return 'data';
					default:
						return null;
				}
			});
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue({
				mimeType: 'text/plain',
				data: '',
			});

			const result = await jiraNode.execute.call(executeFunctionsMock);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'Download failed' });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should return error items for failed items and success items for passing items', async () => {
			const errorMessage = 'Issue does not exist';
			jiraSoftwareCloudApiRequestMock
				.mockResolvedValueOnce({ id: '1', key: 'TEST-1' })
				.mockRejectedValueOnce(new Error(errorMessage))
				.mockResolvedValueOnce({ id: '3', key: 'TEST-3' });

			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);

			executeFunctionsMock.helpers.returnJsonArray.mockImplementation(
				(data: IDataObject | IDataObject[]) =>
					[{ json: data as IDataObject }] as INodeExecutionData[],
			);
			executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
				(items) =>
					items as unknown as ReturnType<
						typeof executeFunctionsMock.helpers.constructExecutionMetaData
					>,
			);

			executeFunctionsMock.getNodeParameter.mockImplementation((parameterName: string) => {
				switch (parameterName) {
					case 'resource':
						return 'issue';
					case 'operation':
						return 'get';
					case 'jiraVersion':
						return 'cloud';
					case 'issueKey':
						return 'TEST-123';
					case 'simplifyOutput':
						return false;
					case 'additionalFields':
						return {};
					default:
						return null;
				}
			});

			const result = await jiraNode.execute.call(executeFunctionsMock);

			expect(result[0]).toHaveLength(3);
			expect(result[0][0].json).toEqual({ id: '1', key: 'TEST-1' });
			expect(result[0][1].json).toEqual({ error: errorMessage });
			expect(result[0][2].json).toEqual({ id: '3', key: 'TEST-3' });
		});
	});
});
