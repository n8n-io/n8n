import { mockDeep } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IPollFunctions, INode, ILoadOptionsFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { SalesforceTrigger } from '../SalesforceTrigger.node';

jest.mock('../GenericFunctions', () => ({
	getQuery: jest.fn(),
	salesforceApiRequest: jest.fn(),
	salesforceApiRequestAllItems: jest.fn(),
	sortOptions: jest.fn(),
	getPollStartDate: jest.fn(),
	filterAndManageProcessedItems: jest.fn(),
}));

describe('SalesforceTrigger', () => {
	let trigger: SalesforceTrigger;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockNode: INode;

	const getQuerySpy = jest.spyOn(GenericFunctions, 'getQuery');
	const salesforceApiRequestSpy = jest.spyOn(GenericFunctions, 'salesforceApiRequest');
	const salesforceApiRequestAllItemsSpy = jest.spyOn(
		GenericFunctions,
		'salesforceApiRequestAllItems',
	);
	const sortOptionsSpy = jest.spyOn(GenericFunctions, 'sortOptions');
	const getPollStartDateSpy = jest.spyOn(GenericFunctions, 'getPollStartDate');
	const filterAndManageProcessedItemsSpy = jest.spyOn(
		GenericFunctions,
		'filterAndManageProcessedItems',
	);

	beforeEach(() => {
		trigger = new SalesforceTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Salesforce Trigger Test',
			type: 'n8n-nodes-base.salesforceTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		jest.clearAllMocks();

		mockPollFunctions.getNode.mockReturnValue(mockNode);
		mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
		mockPollFunctions.getMode.mockReturnValue('trigger');
		mockPollFunctions.getWorkflow.mockReturnValue({ id: 'test-workflow', active: true });
		mockPollFunctions.logger.error = jest.fn();
		(mockPollFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: unknown[]) =>
			data.map((item: unknown, index: number) => ({ json: item, pairedItem: { item: index } })),
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Methods', () => {
		it('should have correct load options methods', () => {
			expect(trigger.methods?.loadOptions?.getCustomObjects).toBeDefined();
		});

		describe('getCustomObjects', () => {
			it('should return custom objects with sorted options', async () => {
				const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				const mockSobjects = {
					sobjects: [
						{ name: 'Account', label: 'Account', custom: false },
						{ name: 'CustomObject1__c', label: 'Custom Object 1', custom: true },
						{ name: 'Contact', label: 'Contact', custom: false },
						{ name: 'CustomObject2__c', label: 'Custom Object 2', custom: true },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockSobjects);
				sortOptionsSpy.mockImplementation((options) => {
					return options.sort((a, b) => a.name.localeCompare(b.name));
				});

				const result =
					await trigger.methods!.loadOptions!.getCustomObjects.call(mockLoadOptionsFunctions);

				expect(salesforceApiRequestSpy).toHaveBeenCalledWith('GET', '/sobjects');
				expect(sortOptionsSpy).toHaveBeenCalled();

				expect(result).toEqual([
					{ name: 'Custom Object 1', value: 'CustomObject1__c' },
					{ name: 'Custom Object 2', value: 'CustomObject2__c' },
				]);
			});

			it('should handle empty sobjects response', async () => {
				const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				const mockSobjects = { sobjects: [] };

				salesforceApiRequestSpy.mockResolvedValue(mockSobjects);

				const result =
					await trigger.methods!.loadOptions!.getCustomObjects.call(mockLoadOptionsFunctions);

				expect(result).toEqual([]);
			});

			it('should filter out non-custom objects', async () => {
				const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				const mockSobjects = {
					sobjects: [
						{ name: 'Account', label: 'Account', custom: false },
						{ name: 'Contact', label: 'Contact', custom: false },
						{ name: 'Lead', label: 'Lead', custom: false },
					],
				};

				salesforceApiRequestSpy.mockResolvedValue(mockSobjects);

				const result =
					await trigger.methods!.loadOptions!.getCustomObjects.call(mockLoadOptionsFunctions);

				expect(result).toEqual([]);
			});
		});
	});

	describe('Poll Function - Parameter Setup', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					triggerOn: 'accountCreated',
					customObject: 'CustomObject__c',
				};
				return params[paramName] ?? '';
			});
		});

		it('should handle standard object creation trigger', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue(
				'SELECT id,name,type FROM Account WHERE CreatedDate >= 2023-01-01T00:00:00.000Z',
			);
			salesforceApiRequestAllItemsSpy.mockResolvedValue([
				{ Id: '001000000000001', Name: 'Test Account 1' },
				{ Id: '001000000000002', Name: 'Test Account 2' },
			]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [
					{ Id: '001000000000001', Name: 'Test Account 1' },
					{ Id: '001000000000002', Name: 'Test Account 2' },
				],
				updatedProcessedIds: ['001000000000001', '001000000000002'],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(getPollStartDateSpy).toHaveBeenCalledWith(undefined);
			expect(getQuerySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conditionsUi: {
						conditionValues: expect.arrayContaining([
							expect.objectContaining({
								field: 'CreatedDate',
								operation: '>=',
								value: '2023-01-01T00:00:00.000Z',
							}),
						]),
					},
				}),
				'Account',
				true,
			);
			expect(salesforceApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'records',
				'GET',
				'/query',
				{},
				expect.objectContaining({
					q: 'SELECT id,name,type FROM Account WHERE CreatedDate >= 2023-01-01T00:00:00.000Z',
				}),
			);
			expect(filterAndManageProcessedItemsSpy).toHaveBeenCalled();

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(2);
			expect(result![0][0].json).toEqual({ Id: '001000000000001', Name: 'Test Account 1' });
		});

		it('should handle standard object update trigger', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'accountUpdated';
				return '';
			});

			const mockWorkflowData: IDataObject = { lastTimeChecked: '2023-01-01T00:00:00.000Z' };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2022-12-31T23:45:00.000Z');
			getQuerySpy.mockReturnValue(
				'SELECT id,name,type FROM Account WHERE LastModifiedDate >= 2022-12-31T23:45:00.000Z',
			);
			salesforceApiRequestAllItemsSpy.mockResolvedValue([
				{ Id: '001000000000001', Name: 'Updated Account' },
			]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [{ Id: '001000000000001', Name: 'Updated Account' }],
				updatedProcessedIds: ['001000000000001'],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(getQuerySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conditionsUi: {
						conditionValues: expect.arrayContaining([
							expect.objectContaining({
								field: 'LastModifiedDate',
								operation: '>=',
								value: '2022-12-31T23:45:00.000Z',
							}),
							expect.objectContaining({
								field: 'CreatedDate',
								operation: '<',
								value: '2022-12-31T23:45:00.000Z',
							}),
						]),
					},
				}),
				'Account',
				true,
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
		});

		it('should handle custom object triggers', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'customObjectCreated';
				if (paramName === 'customObject') return 'CustomObject__c';
				return '';
			});

			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue(
				'SELECT id FROM CustomObject__c WHERE CreatedDate >= 2023-01-01T00:00:00.000Z',
			);
			salesforceApiRequestAllItemsSpy.mockResolvedValue([
				{ Id: 'a00000000000001', Name: 'Custom Object 1' },
			]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [{ Id: 'a00000000000001', Name: 'Custom Object 1' }],
				updatedProcessedIds: ['a00000000000001'],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(getQuerySpy).toHaveBeenCalledWith(expect.any(Object), 'CustomObject__c', true);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
		});

		it('should initialize processedIds when not present', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			expect(mockWorkflowData.processedIds).toEqual([]);
		});

		it('should update lastTimeChecked after polling', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			expect(mockWorkflowData.lastTimeChecked).toBeDefined();
			expect(DateTime.fromISO(mockWorkflowData.lastTimeChecked as string).isValid).toBe(true);
		});
	});

	describe('Poll Function - Manual Mode', () => {
		beforeEach(() => {
			mockPollFunctions.getMode.mockReturnValue('manual');
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'accountCreated';
				return '';
			});
		});

		it('should use limit 1 in manual mode', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account LIMIT 1');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([
				{ Id: '001000000000001', Name: 'Test Account' },
			]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [{ Id: '001000000000001', Name: 'Test Account' }],
				updatedProcessedIds: ['001000000000001'],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(getQuerySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conditionsUi: {
						conditionValues: [],
					},
				}),
				'Account',
				false,
				1,
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
		});

		it('should not add date conditions in manual mode', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account LIMIT 1');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			expect(getQuerySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conditionsUi: {
						conditionValues: [],
					},
				}),
				'Account',
				false,
				1,
			);
		});
	});

	describe('Poll Function - Error Handling', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'accountCreated';
				return '';
			});
		});

		it('should throw NodeApiError for API request errors', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockRejectedValue(new Error('API Error'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(NodeApiError);
		});

		it('should throw error in manual mode even with lastTimeChecked', async () => {
			mockPollFunctions.getMode.mockReturnValue('manual');
			const mockWorkflowData: IDataObject = { lastTimeChecked: '2023-01-01T00:00:00.000Z' };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account LIMIT 1');
			salesforceApiRequestAllItemsSpy.mockRejectedValue(new Error('API Error'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');
		});

		it('should log error and rethrow in trigger mode with lastTimeChecked', async () => {
			const mockWorkflowData: IDataObject = { lastTimeChecked: '2023-01-01T00:00:00.000Z' };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			const testError = new Error('API Error');
			getPollStartDateSpy.mockReturnValue('2022-12-31T23:45:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockRejectedValue(testError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');

			expect(mockPollFunctions.logger.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"There was a problem in 'Salesforce Trigger Test' node in workflow 'test-workflow'",
				),
				expect.objectContaining({
					node: 'Salesforce Trigger Test',
					workflowId: 'test-workflow',
					error: testError,
				}),
			);
		});

		it('should throw error immediately when no lastTimeChecked exists', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			const testError = new Error('API Error');
			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockRejectedValue(testError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');

			expect(mockPollFunctions.logger.error).not.toHaveBeenCalled();
		});
	});

	describe('Poll Function - Edge Cases', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'accountCreated';
				return '';
			});
		});

		it('should return null when no data is found', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(mockWorkflowData.lastTimeChecked).toBeDefined();
		});

		it('should return null when no new items after filtering', async () => {
			const mockWorkflowData: IDataObject = { processedIds: ['001000000000001'] };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([
				{ Id: '001000000000001', Name: 'Already Processed Account' },
			]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: ['001000000000001'],
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should handle null/undefined responseData', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id,name,type FROM Account');
			salesforceApiRequestAllItemsSpy.mockResolvedValue(null);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(mockWorkflowData.lastTimeChecked).toBeDefined();
		});

		it('should handle empty string triggerOn parameter', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return '';
				return '';
			});

			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id FROM  LIMIT 1');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			// When triggerOn is empty, it results in 'Updated' operation and empty resource name
			expect(getQuerySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conditionsUi: expect.objectContaining({
						conditionValues: expect.arrayContaining([
							expect.objectContaining({
								field: 'LastModifiedDate',
							}),
						]),
					}),
				}),
				'', // Empty resource name
				true,
			);
		});
	});

	describe('Poll Function - Date Handling', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return 'leadUpdated';
				return '';
			});
		});

		it('should use getPollStartDate with safety margin', async () => {
			const mockWorkflowData: IDataObject = { lastTimeChecked: '2023-01-01T12:00:00.000Z' };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			getPollStartDateSpy.mockReturnValue('2023-01-01T11:45:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id FROM Lead');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			expect(getPollStartDateSpy).toHaveBeenCalledWith('2023-01-01T12:00:00.000Z');
		});

		it('should set endDate to current time', async () => {
			const mockWorkflowData: IDataObject = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWorkflowData);

			const startTime = DateTime.now();

			getPollStartDateSpy.mockReturnValue('2023-01-01T00:00:00.000Z');
			getQuerySpy.mockReturnValue('SELECT id FROM Lead');
			salesforceApiRequestAllItemsSpy.mockResolvedValue([]);
			filterAndManageProcessedItemsSpy.mockReturnValue({
				newItems: [],
				updatedProcessedIds: [],
			});

			await trigger.poll.call(mockPollFunctions);

			const endTime = DateTime.now();
			const lastTimeChecked = DateTime.fromISO(mockWorkflowData.lastTimeChecked as string);

			expect(lastTimeChecked >= startTime).toBe(true);
			expect(lastTimeChecked <= endTime).toBe(true);
		});
	});
});
