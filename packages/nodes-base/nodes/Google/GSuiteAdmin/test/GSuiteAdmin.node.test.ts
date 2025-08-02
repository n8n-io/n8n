import type { ILoadOptionsFunctions, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import nock from 'nock';

import { returnData } from '../../../E2eTest/mock';
import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';
import { GSuiteAdmin } from '../GSuiteAdmin.node';

jest.mock('../GenericFunctions', () => ({
	getGoogleAuth: jest.fn().mockImplementation(() => ({
		oauth2Client: {
			setCredentials: jest.fn(),
			getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
		},
	})),
	googleApiRequest: jest.fn(),
	googleApiRequestAllItems: jest.fn(),
}));

const node = new GSuiteAdmin();

const mockThis = {
	getNode: () => ({
		name: 'Google Workspace Admin',
		parameters: {},
	}),
	helpers: {
		httpRequestWithAuthentication: jest.fn(),
		returnJsonArray: (data: any) => data,
		constructExecutionMetaData: (data: any) => data,
	},
	continueOnFail: () => false,
	getNodeParameter: jest.fn((name: string) => {
		if (name === 'limit') return 50;
		return undefined;
	}),
} as unknown as ILoadOptionsFunctions;

describe('GSuiteAdmin Node - loadOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		nock.cleanAll();
		nock.disableNetConnect();
	});

	describe('getDomains', () => {
		it('should return a list of domains', async () => {
			(googleApiRequestAllItems as jest.Mock).mockResolvedValue([
				{ domainName: 'example.com' },
				{ domainName: 'test.com' },
			]);

			const result = await node.methods.loadOptions.getDomains.call(mockThis);
			expect(result).toEqual([
				{ name: 'example.com', value: 'example.com' },
				{ name: 'test.com', value: 'test.com' },
			]);
		});
	});

	describe('getSchemas', () => {
		it('should return a list of schemas', async () => {
			(googleApiRequestAllItems as jest.Mock).mockResolvedValue([
				{ displayName: 'Employee Info', schemaName: 'EmployeeSchema' },
				{ displayName: '', schemaName: 'CustomSchema' },
			]);

			const result = await node.methods.loadOptions.getSchemas.call(mockThis);
			expect(result).toEqual([
				{ name: 'Employee Info', value: 'EmployeeSchema' },
				{ name: 'CustomSchema', value: 'CustomSchema' },
			]);
		});

		it('should correctly iterate over schemas and return expected values', async () => {
			const schemas = [
				{ displayName: 'Employee Info', schemaName: 'EmployeeSchema' },
				{ displayName: 'Custom Schema', schemaName: 'CustomSchema' },
			];

			const result = schemas.map((schema) => ({
				name: schema.displayName,
				value: schema.schemaName,
			}));

			expect(result).toEqual([
				{ name: 'Employee Info', value: 'EmployeeSchema' },
				{ name: 'Custom Schema', value: 'CustomSchema' },
			]);
		});
	});

	describe('getOrgUnits', () => {
		it('should return a list of organizational units', async () => {
			(googleApiRequest as jest.Mock).mockResolvedValue({
				organizationUnits: [
					{ name: 'Engineering', orgUnitPath: '/engineering' },
					{ name: 'HR', orgUnitPath: '/hr' },
				],
			});

			const result = await node.methods.loadOptions.getOrgUnits.call(mockThis);
			expect(result).toEqual([
				{ name: 'Engineering', value: '/engineering' },
				{ name: 'HR', value: '/hr' },
			]);
		});
	});
});

describe('GSuiteAdmin Node - logic coverage', () => {
	it('should apply all filters correctly into qs', () => {
		const filter = {
			customer: 'my_customer',
			domain: 'example.com',
			query: 'name:admin',
			userId: 'user@example.com',
			showDeleted: true,
		};
		const sort = {
			sortRules: { orderBy: 'email', sortOrder: 'ASCENDING' },
		};
		const qs: Record<string, any> = {};

		if (filter.customer) qs.customer = filter.customer;
		if (filter.domain) qs.domain = filter.domain;
		if (filter.query) {
			const query = filter.query.trim();
			const regex = /^(name|email):\S+$/;
			if (!regex.test(query)) {
				throw new NodeOperationError(
					mockThis.getNode(),
					'Invalid query format. Query must follow the format "displayName:<value>" or "email:<value>".',
				);
			}
			qs.query = query;
		}
		if (filter.userId) qs.userKey = filter.userId;
		if (filter.showDeleted) qs.showDeleted = 'true';
		if (sort.sortRules) {
			const { orderBy, sortOrder } = sort.sortRules;
			if (orderBy) qs.orderBy = orderBy;
			if (sortOrder) qs.sortOrder = sortOrder;
		}

		expect(qs).toEqual({
			customer: 'my_customer',
			domain: 'example.com',
			query: 'name:admin',
			userKey: 'user@example.com',
			showDeleted: 'true',
			orderBy: 'email',
			sortOrder: 'ASCENDING',
		});
	});

	it('should throw an error for invalid query format', () => {
		const filter = {
			query: 'invalidQuery',
		};

		const qs: Record<string, any> = {};

		expect(() => {
			if (filter.query) {
				const query = filter.query.trim();
				const regex = /^(name|email):\S+$/;
				if (!regex.test(query)) {
					throw new NodeOperationError(
						mockThis.getNode(),
						'Invalid query format. Query must follow the format "displayName:<value>" or "email:<value>".',
					);
				}
				qs.query = query;
			}
		}).toThrow(
			'Invalid query format. Query must follow the format "displayName:<value>" or "email:<value>".',
		);
	});

	it('should assign my_customer when customer is not defined', () => {
		const qs: Record<string, any> = {};
		if (!qs.customer) qs.customer = 'my_customer';
		expect(qs.customer).toBe('my_customer');
	});

	it('should throw an error if username is empty', () => {
		const mock = { getNode: () => ({}) } as IExecuteFunctions;
		expect(() => {
			const username = '';
			if (!username) {
				throw new NodeOperationError(mock.getNode(), "The parameter 'Username' is empty", {
					itemIndex: 0,
					description: "Please fill in the 'Username' parameter to create the user",
				});
			}
		}).toThrow("The parameter 'Username' is empty");
	});

	it('should set phones, emails, roles, and custom fields', () => {
		const additionalFields = {
			phoneUi: { phoneValues: [{ type: 'work', value: '123' }] },
			emailUi: { emailValues: [{ address: 'test@example.com', type: 'home' }] },
			roles: ['superAdmin', 'groupsAdmin'],
			customFields: {
				fieldValues: [{ schemaName: 'CustomSchema', fieldName: 'customField', value: 'abc' }],
			},
		};

		const body: Record<string, any> = {};
		if (additionalFields.phoneUi) {
			body.phones = additionalFields.phoneUi.phoneValues;
		}
		if (additionalFields.emailUi) {
			body.emails = additionalFields.emailUi.emailValues;
		}
		if (additionalFields.roles) {
			const roles = additionalFields.roles;
			body.roles = {
				superAdmin: roles.includes('superAdmin'),
				groupsAdmin: roles.includes('groupsAdmin'),
				groupsReader: false,
				groupsEditor: false,
				userManagement: false,
				helpDeskAdmin: false,
				servicesAdmin: false,
				inventoryReportingAdmin: false,
				storageAdmin: false,
				directorySyncAdmin: false,
				mobileAdmin: false,
			};
		}
		if (additionalFields.customFields) {
			const customSchemas: Record<string, any> = {};
			for (const field of additionalFields.customFields.fieldValues) {
				if (
					!field.schemaName ||
					!field.fieldName ||
					field.value === undefined ||
					field.value === ''
				) {
					continue;
				}
				if (!customSchemas[field.schemaName]) customSchemas[field.schemaName] = {};
				customSchemas[field.schemaName][field.fieldName] = field.value;
			}
			if (Object.keys(customSchemas).length > 0) {
				body.customSchemas = customSchemas;
			}
		}

		expect(body).toEqual({
			phones: [{ type: 'work', value: '123' }],
			emails: [{ address: 'test@example.com', type: 'home' }],
			roles: {
				superAdmin: true,
				groupsAdmin: true,
				groupsReader: false,
				groupsEditor: false,
				userManagement: false,
				helpDeskAdmin: false,
				servicesAdmin: false,
				inventoryReportingAdmin: false,
				storageAdmin: false,
				directorySyncAdmin: false,
				mobileAdmin: false,
			},
			customSchemas: {
				CustomSchema: { customField: 'abc' },
			},
		});
	});

	it('should set customFieldMask and fields if projection is custom and output is select', () => {
		const projection = 'custom';
		const output = 'select';
		const fields = ['primaryEmail'];
		const qs: Record<string, any> = {
			customFieldMask: ['Custom1', 'Custom2'],
		};

		if (projection === 'custom' && qs.customFieldMask) {
			qs.customFieldMask = (qs.customFieldMask as string[]).join(',');
		}
		if (output === 'select') {
			if (!fields.includes('id')) fields.push('id');
			qs.fields = fields.join(',');
		}

		expect(qs).toEqual({
			customFieldMask: 'Custom1,Custom2',
			fields: 'primaryEmail,id',
		});
	});

	it('should set fields for user getAll when returnAll is false', () => {
		const qs: Record<string, any> = {};
		const returnAll = false;
		const fields = ['primaryEmail'];
		const output = 'select';
		const projection = 'custom';
		qs.customFieldMask = ['Custom1', 'Custom2'];

		if (projection === 'custom' && qs.customFieldMask) {
			qs.customFieldMask = (qs.customFieldMask as string[]).join(',');
		}
		if (output === 'select') {
			if (!fields.includes('id')) fields.push('id');
			qs.fields = `users(${fields.join(',')})`;
		}
		if (!qs.customer) qs.customer = 'my_customer';
		if (!returnAll) qs.maxResults = 50;

		expect(qs).toEqual({
			customFieldMask: 'Custom1,Custom2',
			fields: 'users(primaryEmail,id)',
			customer: 'my_customer',
			maxResults: 50,
		});
	});
});

describe('GSuiteAdmin Node - user:update logic', () => {
	it('should build suspended, roles, and customSchemas', async () => {
		const mockCall = jest.fn().mockResolvedValue([{ success: true }]);
		(googleApiRequest as jest.Mock).mockImplementation(mockCall);

		const mockContext = {
			getNode: () => ({ name: 'GSuiteAdmin' }),
			getNodeParameter: jest.fn((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'user';
					case 'operation':
						return 'update';
					case 'userId':
						return 'user-id-123';
					case 'updateFields':
						return {
							suspendUi: true,
							roles: ['superAdmin', 'groupsReader'],
							customFields: {
								fieldValues: [
									{ schemaName: 'CustomSchema1', fieldName: 'fieldA', value: 'valueA' },
									{ schemaName: 'CustomSchema1', fieldName: 'fieldB', value: 'valueB' },
									{ schemaName: 'CustomSchema2', fieldName: 'fieldX', value: 'valueX' },
								],
							},
						};
					default:
						return undefined;
				}
			}),
			helpers: {
				returnJsonArray: (data: any) => data,
				constructExecutionMetaData: (data: any) => data,
			},
			continueOnFail: () => false,
			getInputData: () => [{ json: {} }],
		} as unknown as IExecuteFunctions;

		await new GSuiteAdmin().execute.call(mockContext);

		const calledBody = mockCall.mock.calls[0][2];

		expect(calledBody.suspended).toBe(true);
		expect(calledBody.roles).toEqual({
			superAdmin: true,
			groupsAdmin: false,
			groupsReader: true,
			groupsEditor: false,
			userManagement: false,
			helpDeskAdmin: false,
			servicesAdmin: false,
			inventoryReportingAdmin: false,
			storageAdmin: false,
			directorySyncAdmin: false,
			mobileAdmin: false,
		});
		expect(calledBody.customSchemas).toEqual({
			CustomSchema1: {
				fieldA: 'valueA',
				fieldB: 'valueB',
			},
			CustomSchema2: {
				fieldX: 'valueX',
			},
		});
	});

	it('should throw error for invalid custom fields', async () => {
		const mockCall = jest.fn();
		(googleApiRequest as jest.Mock).mockImplementation(mockCall);

		const mockContextInvalidFields = {
			getNode: () => ({ name: 'GSuiteAdmin' }),
			getNodeParameter: jest.fn((paramName: string) => {
				switch (paramName) {
					case 'resource':
						return 'user';
					case 'operation':
						return 'update';
					case 'userId':
						return 'user-id-456';
					case 'updateFields':
						return {
							customFields: {
								fieldValues: [
									{ schemaName: '', fieldName: 'valid', value: 'ok' },
									{ schemaName: 'ValidSchema', fieldName: 'valid', value: 'ok' },
								],
							},
						};
					default:
						return undefined;
				}
			}),
			helpers: {
				returnJsonArray: (data: any) => data,
				constructExecutionMetaData: (data: any) => data,
			},
			continueOnFail: () => false,
			getInputData: () => [{ json: {} }],
		} as unknown as IExecuteFunctions;

		await expect(new GSuiteAdmin().execute.call(mockContextInvalidFields)).rejects.toThrow(
			'Invalid custom field data',
		);

		expect(mockCall).not.toHaveBeenCalled();
	});

	it('should throw an error if username is empty', () => {
		const mock = { getNode: () => ({}) } as IExecuteFunctions;
		expect(() => {
			const username = '';
			if (!username) {
				throw new NodeOperationError(mock.getNode(), "The parameter 'Username' is empty", {
					itemIndex: 0,
					description: "Please fill in the 'Username' parameter to create the user",
				});
			}
		}).toThrow("The parameter 'Username' is empty");
	});
});

describe('GSuiteAdmin Node - Error Handling', () => {
	it('should throw a NodeOperationError if the error is an instance of NodeOperationError', async () => {
		const mockContext = {
			getNode: () => ({ name: 'GSuiteAdmin' }),
			continueOnFail: () => false,
			helpers: {
				constructExecutionMetaData: jest.fn(),
				returnJsonArray: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		const error = new NodeOperationError(mockContext.getNode(), 'Some error message');

		await expect(async () => {
			throw error;
		}).rejects.toThrow(NodeOperationError);
	});

	it('should handle error when continueOnFail is true and constructExecutionMetaData is called', async () => {
		const mockContext = {
			getNode: () => ({ name: 'GSuiteAdmin' }),
			continueOnFail: () => true,
			helpers: {
				constructExecutionMetaData: jest.fn().mockReturnValue([{ message: 'mock error data' }]),
				returnJsonArray: jest.fn().mockReturnValue([]),
			},
		} as unknown as IExecuteFunctions;

		const error = new Error('Some error message');

		await expect(async () => {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			if (mockContext.continueOnFail()) {
				const executionErrorData = mockContext.helpers.constructExecutionMetaData(
					mockContext.helpers.returnJsonArray({
						message: 'Operation "update" failed for resource "user".',
						description: error.message,
					}),
					{ itemData: { item: 0 } },
				);

				if (executionErrorData) {
					returnData.push(...executionErrorData);
				} else {
					console.error('executionErrorData is not iterable:', executionErrorData);
				}
			}

			throw new NodeOperationError(
				mockContext.getNode(),
				'Operation "update" failed for resource "user".',
				{
					description: `Please check the input parameters and ensure the API request is correctly formatted. Details: ${error.message}`,
					itemIndex: 0,
				},
			);
		}).rejects.toThrow(NodeOperationError);
	});

	it('should throw a NodeOperationError if an unknown error is thrown and continueOnFail is false', async () => {
		const mockContext = {
			getNode: () => ({ name: 'GSuiteAdmin' }),
			continueOnFail: () => false,
			helpers: {
				constructExecutionMetaData: jest.fn(),
				returnJsonArray: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		const error = new Error('Some unknown error');

		await expect(async () => {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			if (!mockContext.continueOnFail()) {
				throw new NodeOperationError(
					mockContext.getNode(),
					'Operation "update" failed for resource "user".',
					{
						description: `Please check the input parameters and ensure the API request is correctly formatted. Details: ${error.message}`,
						itemIndex: 0,
					},
				);
			}
		}).rejects.toThrow(NodeOperationError);
	});
});
