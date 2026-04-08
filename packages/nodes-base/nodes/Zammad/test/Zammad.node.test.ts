import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { Zammad } from '../Zammad.node';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	zammadApiRequest: jest.fn(),
	zammadApiRequestAllItems: jest.fn(),
	getAllFields: jest.fn(),
	getGroupCustomFields: jest.fn(),
	getOrganizationCustomFields: jest.fn(),
	getUserCustomFields: jest.fn(),
	getTicketCustomFields: jest.fn(),
	getGroupFields: jest.fn(),
	getOrganizationFields: jest.fn(),
	getTicketFields: jest.fn(),
	getUserFields: jest.fn(),
	doesNotBelongToZammad: jest.fn(),
	fieldToLoadOption: jest.fn(),
	isCustomer: jest.fn(),
	isNotZammadFoundation: jest.fn(),
	throwOnEmptyUpdate: jest.fn(),
}));

describe('Zammad Node', () => {
	let node: Zammad;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockLoadOptionsFunctions: Partial<ILoadOptionsFunctions>;
	let mockCredentialTestFunctions: Partial<ICredentialTestFunctions>;

	beforeEach(() => {
		node = new Zammad();
		jest.clearAllMocks();

		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{}]),
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ id: 'test-node', name: 'Test Node', type: 'zammad' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				constructExecutionMetaData: jest
					.fn()
					.mockImplementation((data: any, meta: any) =>
						data.map((item: any) => ({ json: item, itemData: meta.itemData })),
					),
				returnJsonArray: jest
					.fn()
					.mockImplementation((data: any) => (Array.isArray(data) ? data : [data])),
			},
		} as unknown as Partial<IExecuteFunctions>;

		mockLoadOptionsFunctions = {
			getCredentials: jest.fn(),
			getNode: jest.fn(),
		} as Partial<ILoadOptionsFunctions>;

		mockCredentialTestFunctions = {
			helpers: {
				request: jest.fn(),
			},
		} as unknown as Partial<ICredentialTestFunctions>;
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.displayName).toBe('Zammad');
			expect(node.description.name).toBe('zammad');
			expect(node.description.version).toBe(1);
			expect(node.description.description).toBe('Consume the Zammad API');
		});

		it('should support correct authentication methods', () => {
			const authProperty = node.description.properties?.find((p) => p.name === 'authentication');
			expect(authProperty?.options).toEqual([
				{ name: 'Basic Auth', value: 'basicAuth' },
				{ name: 'Token Auth', value: 'tokenAuth' },
			]);
			expect(authProperty?.default).toBe('tokenAuth');
		});

		it('should support correct resources', () => {
			const resourceProperty = node.description.properties?.find((p) => p.name === 'resource');
			expect(resourceProperty?.options).toEqual([
				{ name: 'Group', value: 'group' },
				{ name: 'Organization', value: 'organization' },
				{ name: 'Ticket', value: 'ticket' },
				{ name: 'User', value: 'user' },
			]);
			expect(resourceProperty?.default).toBe('user');
		});
	});

	describe('Credential Tests', () => {
		it('should test basic auth credentials successfully', async () => {
			const credentials: ICredentialsDecrypted = {
				id: 'test',
				name: 'test',
				type: 'zammadBasicAuthApi',
				data: {
					baseUrl: 'https://test.zammad.com',
					username: 'testuser',
					password: 'testpass',
					allowUnauthorizedCerts: false,
				},
			};

			(mockCredentialTestFunctions.helpers!.request as jest.Mock).mockResolvedValue({
				success: true,
			});

			const result = await node.methods.credentialTest.zammadBasicAuthApiTest.call(
				mockCredentialTestFunctions as ICredentialTestFunctions,
				credentials,
			);

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful',
			});

			expect(mockCredentialTestFunctions.helpers!.request).toHaveBeenCalledWith({
				method: 'GET',
				uri: 'https://test.zammad.com/api/v1/users/me',
				json: true,
				rejectUnauthorized: true,
				auth: {
					user: 'testuser',
					pass: 'testpass',
				},
			});
		});

		it('should test token auth credentials successfully', async () => {
			const credentials: ICredentialsDecrypted = {
				id: 'test',
				name: 'test',
				type: 'zammadTokenAuthApi',
				data: {
					baseUrl: 'https://test.zammad.com/',
					accessToken: 'test-token',
					allowUnauthorizedCerts: true,
				},
			};

			(mockCredentialTestFunctions.helpers!.request as jest.Mock).mockResolvedValue({
				success: true,
			});

			const result = await node.methods.credentialTest.zammadTokenAuthApiTest.call(
				mockCredentialTestFunctions as ICredentialTestFunctions,
				credentials,
			);

			expect(result).toEqual({
				status: 'OK',
				message: 'Authentication successful',
			});

			expect(mockCredentialTestFunctions.helpers!.request).toHaveBeenCalledWith({
				method: 'GET',
				uri: 'https://test.zammad.com/api/v1/users/me',
				json: true,
				rejectUnauthorized: false,
				headers: {
					Authorization: 'Token token=test-token',
				},
			});
		});

		it('should handle credential test errors', async () => {
			const credentials: ICredentialsDecrypted = {
				id: 'test',
				name: 'test',
				type: 'zammadBasicAuthApi',
				data: {
					baseUrl: 'https://test.zammad.com',
					username: 'wronguser',
					password: 'wrongpass',
					allowUnauthorizedCerts: false,
				},
			};

			const error = new Error('Unauthorized');
			(mockCredentialTestFunctions.helpers!.request as jest.Mock).mockRejectedValue(error);

			const result = await node.methods.credentialTest.zammadBasicAuthApiTest.call(
				mockCredentialTestFunctions as ICredentialTestFunctions,
				credentials,
			);

			expect(result).toEqual({
				status: 'Error',
				message: 'Unauthorized',
			});
		});
	});

	describe('Load Options', () => {
		beforeEach(() => {
			(GenericFunctions.getAllFields as jest.Mock).mockResolvedValue([
				{ id: 1, name: 'Test Field', object: 'User' },
				{ id: 2, name: 'Custom Field', object: 'User' },
			]);
		});

		it('should load group custom fields', async () => {
			(GenericFunctions.getGroupCustomFields as jest.Mock).mockReturnValue([
				{ id: 1, name: 'Group Custom Field' },
			]);
			(GenericFunctions.fieldToLoadOption as jest.Mock).mockReturnValue({
				name: 'Group Custom Field',
				value: 1,
			});

			const result = await node.methods.loadOptions.loadGroupCustomFields.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.getAllFields).toHaveBeenCalled();
			expect(GenericFunctions.getGroupCustomFields).toHaveBeenCalled();
			expect(result).toEqual([{ name: 'Group Custom Field', value: 1 }]);
		});

		it('should load ticket states', async () => {
			const mockStates = [
				{ id: 1, name: 'Open' },
				{ id: 2, name: 'Closed' },
			];
			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockStates);

			const result = await node.methods.loadOptions.loadTicketStates.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/ticket_states');
			expect(result).toEqual([
				{ name: 'Open', value: 1 },
				{ name: 'Closed', value: 2 },
			]);
		});

		it('should load groups', async () => {
			const mockGroups = [
				{ id: 1, name: 'Support' },
				{ id: 2, name: 'Sales' },
			];
			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockGroups);

			const result = await node.methods.loadOptions.loadGroups.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/groups');
			expect(result).toEqual([
				{ name: 'Support', value: 1 },
				{ name: 'Sales', value: 2 },
			]);
		});

		it('should load group names', async () => {
			const mockGroups = [
				{ id: 1, name: 'Support' },
				{ id: 2, name: 'Sales' },
			];
			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockGroups);

			const result = await node.methods.loadOptions.loadGroupNames.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/groups');
			expect(result).toEqual([
				{ name: 'Support', value: 'Support' },
				{ name: 'Sales', value: 'Sales' },
			]);
		});

		it('should load organization names', async () => {
			const mockOrganizations = [
				{ id: 1, name: 'Acme Corp' },
				{ id: 2, name: 'Beta Inc' },
				{ id: 3, name: 'Zammad Foundation' }, // This should be filtered out
			];
			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockOrganizations);
			(GenericFunctions.isNotZammadFoundation as jest.Mock).mockImplementation(
				(org) => org.name !== 'Zammad Foundation',
			);

			const result = await node.methods.loadOptions.loadOrganizationNames.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/organizations');
			expect(result).toEqual([
				{ name: 'Acme Corp', value: 'Acme Corp' },
				{ name: 'Beta Inc', value: 'Beta Inc' },
			]);
		});

		it('should load customer emails', async () => {
			const mockUsers = [
				{ id: 1, email: 'customer1@example.com', role: 'customer' },
				{ id: 2, email: 'agent@example.com', role: 'agent' },
				{ id: 3, email: 'customer2@example.com', role: 'customer' },
			];
			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUsers);
			(GenericFunctions.isCustomer as jest.Mock).mockImplementation(
				(user) => user.role === 'customer',
			);

			const result = await node.methods.loadOptions.loadCustomerEmails.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/users');
			expect(result).toEqual([
				{ name: 'customer1@example.com', value: 'customer1@example.com' },
				{ name: 'customer2@example.com', value: 'customer2@example.com' },
			]);
		});
	});

	describe('Execute - User Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					if (paramName === 'resource') return 'user';
					if (paramName === 'operation') return 'create';
					return null;
				},
			);
		});

		it('should create a user', async () => {
			const mockUser = { id: 1, firstname: 'John', lastname: 'Doe' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'create';
						case 'firstname':
							return 'John';
						case 'lastname':
							return 'Doe';
						case 'additionalFields':
							return {};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUser);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('POST', '/users', {
				firstname: 'John',
				lastname: 'Doe',
			});
			expect(result).toEqual([[{ json: mockUser, itemData: { item: 0 } }]]);
		});

		it('should update a user', async () => {
			const mockUser = { id: 1, firstname: 'John', lastname: 'Smith' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'update';
						case 'id':
							return '1';
						case 'updateFields':
							return { lastname: 'Smith' };
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUser);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('PUT', '/users/1', {
				lastname: 'Smith',
			});
			expect(result).toEqual([[{ json: mockUser, itemData: { item: 0 } }]]);
		});

		it('should throw error on empty update', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'update';
						case 'id':
							return '1';
						case 'updateFields':
							return {};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.throwOnEmptyUpdate as jest.Mock).mockImplementation(() => {
				throw new NodeOperationError(
					mockExecuteFunctions.getNode!(),
					'Please enter at least one field to update for the user resource',
				);
			});

			await expect(node.execute.call(mockExecuteFunctions as IExecuteFunctions)).rejects.toThrow(
				'Please enter at least one field to update for the user resource',
			);

			expect(GenericFunctions.throwOnEmptyUpdate).toHaveBeenCalledWith('user');
		});

		it('should delete a user', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'delete';
						case 'id':
							return '1';
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue({});

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('DELETE', '/users/1');
			expect(result).toEqual([[{ json: { success: true }, itemData: { item: 0 } }]]);
		});

		it('should get a user', async () => {
			const mockUser = { id: 1, firstname: 'John', lastname: 'Doe' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'get';
						case 'id':
							return '1';
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUser);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/users/1');
			expect(result).toEqual([[{ json: mockUser, itemData: { item: 0 } }]]);
		});

		it('should get all users', async () => {
			const mockUsers = [
				{ id: 1, firstname: 'John', lastname: 'Doe', _preferences: {} },
				{ id: 2, firstname: 'Jane', lastname: 'Smith', _preferences: {} },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'getAll';
						case 'filters':
							return {};
						case 'returnAll':
							return true;
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequestAllItems as jest.Mock).mockResolvedValue(mockUsers);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequestAllItems).toHaveBeenCalledWith(
				'GET',
				'/users/search',
				{},
				{ query: '' },
				0,
			);

			const expectedUsers = mockUsers.map(({ _preferences, ...user }) => user);
			expect(result).toEqual([
				expectedUsers.map((user) => ({ json: user, itemData: { item: 0 } })),
			]);
		});

		it('should get current user', async () => {
			const mockUser = { id: 1, firstname: 'Current', lastname: 'User' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'getSelf';
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUser);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('GET', '/users/me');
			expect(result).toEqual([[{ json: mockUser, itemData: { item: 0 } }]]);
		});
	});

	describe('Execute - Ticket Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					if (paramName === 'resource') return 'ticket';
					return null;
				},
			);
		});

		it('should create a ticket with custom fields if specified', async () => {
			const mockTicket = { id: 1, title: 'Test Ticket' };
			const mockArticles = [{ id: 1, body: 'Test article' }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'ticket';
						case 'operation':
							return 'create';
						case 'title':
							return 'Test Ticket';
						case 'group':
							return 'Support';
						case 'customer':
							return 'test@example.com';
						case 'article':
							return {
								articleDetails: {
									body: 'Test article',
									type: 'note',
									visibility: 'public',
								},
							};
						case 'additionalFields':
							return {
								customFieldsUi: {
									// eslint-disable-next-line
									customFieldPairs: [{ name: 'linear', value: '1234' }],
								},
							};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock)
				.mockResolvedValueOnce(mockTicket)
				.mockResolvedValueOnce(mockArticles);

			await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('POST', '/tickets', {
				article: {
					body: 'Test article',
					type: 'note',
					internal: false,
				},
				title: 'Test Ticket',
				group: 'Support',
				customer: 'test@example.com',
				linear: '1234',
			});
		});

		it('should throw error when creating ticket without article', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'ticket';
						case 'operation':
							return 'create';
						case 'title':
							return 'Test Ticket';
						case 'group':
							return 'Support';
						case 'customer':
							return 'test@example.com';
						case 'article':
							return {};
						case 'additionalFields':
							return {};
						default:
							return null;
					}
				},
			);

			await expect(node.execute.call(mockExecuteFunctions as IExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should update a ticket`s note', async () => {
			const mockTicket = { id: 1, title: 'Updated Ticket' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'ticket';
						case 'operation':
							return 'update';
						case 'id':
							return '1';
						case 'updateFields':
							return {
								title: 'Updated Ticket',
								note: 'Adding a note',
							};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockTicket);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('PUT', '/tickets/1', {
				title: 'Updated Ticket',
				article: {
					body: 'Adding a note',
					internal: true,
					type: 'note',
					content_type: 'text/html',
				},
			});
			expect(result).toEqual([[{ json: mockTicket, itemData: { item: 0 } }]]);
		});

		it('should handle pending_time removal in ticket update', async () => {
			const mockTicket = { id: 1, title: 'Test Ticket' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'ticket';
						case 'operation':
							return 'update';
						case 'id':
							return '1';
						case 'updateFields':
							return {
								title: 'Test Ticket',
								pending_time: '',
							};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockTicket);

			await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('PUT', '/tickets/1', {
				title: 'Test Ticket',
			});
		});
	});

	describe('Execute - Organization Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					if (paramName === 'resource') return 'organization';
					return null;
				},
			);
		});

		it('should create an organization', async () => {
			const mockOrg = { id: 1, name: 'Test Org' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'organization';
						case 'operation':
							return 'create';
						case 'name':
							return 'Test Org';
						case 'additionalFields':
							return {};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockOrg);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('POST', '/organizations', {
				name: 'Test Org',
			});
			expect(result).toEqual([[{ json: mockOrg, itemData: { item: 0 } }]]);
		});

		it('should get all organizations', async () => {
			const mockOrgs = [
				{ id: 1, name: 'Org 1' },
				{ id: 2, name: 'Org 2' },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'organization';
						case 'operation':
							return 'getAll';
						case 'returnAll':
							return false;
						case 'limit':
							return 10;
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequestAllItems as jest.Mock).mockResolvedValue(mockOrgs);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequestAllItems).toHaveBeenCalledWith(
				'GET',
				'/organizations',
				{},
				{},
				10,
			);
			expect(result).toEqual([mockOrgs.map((org) => ({ json: org, itemData: { item: 0 } }))]);
		});
	});

	describe('Execute - Group Operations', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					if (paramName === 'resource') return 'group';
					return null;
				},
			);
		});

		it('should create a group', async () => {
			const mockGroup = { id: 1, name: 'Test Group' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'group';
						case 'operation':
							return 'create';
						case 'name':
							return 'Test Group';
						case 'additionalFields':
							return {};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockGroup);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('POST', '/groups', {
				name: 'Test Group',
			});
			expect(result).toEqual([[{ json: mockGroup, itemData: { item: 0 } }]]);
		});

		it('should get all groups with limit', async () => {
			const mockGroups = [
				{ id: 1, name: 'Group 1' },
				{ id: 2, name: 'Group 2' },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'group';
						case 'operation':
							return 'getAll';
						case 'returnAll':
							return false;
						case 'limit':
							return 5;
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequestAllItems as jest.Mock).mockResolvedValue(mockGroups);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequestAllItems).toHaveBeenCalledWith(
				'GET',
				'/groups',
				{},
				{},
				5,
			);
			expect(result).toEqual([mockGroups.map((group) => ({ json: group, itemData: { item: 0 } }))]);
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					if (paramName === 'resource') return 'user';
					if (paramName === 'operation') return 'get';
					if (paramName === 'id') return '999';
					return null;
				},
			);
		});

		it('should handle API errors and continue on fail', async () => {
			const error = new Error('User not found');
			(GenericFunctions.zammadApiRequest as jest.Mock).mockRejectedValue(error);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toEqual([[{ json: { error: 'User not found' } }]]);
		});

		it('should throw error when continue on fail is false', async () => {
			const error = new Error('User not found');
			(GenericFunctions.zammadApiRequest as jest.Mock).mockRejectedValue(error);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

			await expect(node.execute.call(mockExecuteFunctions as IExecuteFunctions)).rejects.toThrow(
				'User not found',
			);
		});
	});

	describe('Custom Fields Handling', () => {
		it('should handle custom fields in user creation', async () => {
			const mockUser = { id: 1, firstname: 'John', lastname: 'Doe', custom_field: 'value' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'user';
						case 'operation':
							return 'create';
						case 'firstname':
							return 'John';
						case 'lastname':
							return 'Doe';
						case 'additionalFields':
							return {
								customFieldsUi: {
									customFieldPairs: [{ name: 'Custom_field', value: 'value' }],
								},
							};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockUser);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('POST', '/users', {
				firstname: 'John',
				lastname: 'Doe',
				Custom_field: 'value',
			});
			expect(result).toEqual([[{ json: mockUser, itemData: { item: 0 } }]]);
		});

		it('should handle custom fields in ticket update', async () => {
			const mockTicket = { id: 1, title: 'Test Ticket', custom_priority: 'high' };

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName, _itemIndex) => {
					switch (paramName) {
						case 'resource':
							return 'ticket';
						case 'operation':
							return 'update';
						case 'id':
							return '1';
						case 'updateFields':
							return {
								customFieldsUi: {
									customFieldPairs: [{ name: 'Custom_priority', value: 'high' }],
								},
							};
						default:
							return null;
					}
				},
			);

			(GenericFunctions.zammadApiRequest as jest.Mock).mockResolvedValue(mockTicket);

			const result = await node.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(GenericFunctions.zammadApiRequest).toHaveBeenCalledWith('PUT', '/tickets/1', {
				Custom_priority: 'high',
			});
			expect(result).toEqual([[{ json: mockTicket, itemData: { item: 0 } }]]);
		});
	});
});
