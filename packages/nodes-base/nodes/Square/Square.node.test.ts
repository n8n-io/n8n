import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import * as Helpers from '../../test/nodes/Square/helpers';

describe('Square Node', () => {
	let mockApiRequest: jest.Mock;

	beforeAll(() => {
		mockApiRequest = jest.fn();
	});

	beforeEach(() => {
		mockApiRequest.mockReset();
	});

	describe('Customer Operations', () => {
		const mockCustomer = {
			id: 'JDKYHBWT1D4F8MFH63DBMEN8Y4',
			created_at: '2024-01-01T12:00:00Z',
			updated_at: '2024-01-01T12:00:00Z',
			given_name: 'John',
			family_name: 'Doe',
			email_address: 'john.doe@example.com',
			phone_number: '+1234567890',
			version: 1,
		};

		it('should create a customer', async () => {
			mockApiRequest.mockResolvedValueOnce({ customer: mockCustomer });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput('create', {
					given_name: 'John',
					additionalFields: {
						family_name: 'Doe',
						email_address: 'john.doe@example.com',
						phone_number: '+1234567890',
					},
				}),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'POST',
				uri: 'https://connect.squareup.com/v2/customers',
				body: {
					given_name: 'John',
					family_name: 'Doe',
					email_address: 'john.doe@example.com',
					phone_number: '+1234567890',
				},
				json: true,
				headers: {
					'Content-Type': 'application/json',
				},
				qs: undefined,
			});
			expect(result[0]).toEqual([
				{
					json: { customer: mockCustomer },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should get a customer', async () => {
			mockApiRequest.mockResolvedValueOnce({ customer: mockCustomer });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput('get', {
					customerId: 'JDKYHBWT1D4F8MFH63DBMEN8Y4',
				}),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'GET',
				uri: 'https://connect.squareup.com/v2/customers/JDKYHBWT1D4F8MFH63DBMEN8Y4',
				json: true,
				headers: {
					'Content-Type': 'application/json',
				},
				body: {},
			});
			expect(result[0]).toEqual([
				{
					json: { customer: mockCustomer },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should update a customer', async () => {
			const updatedCustomer = {
				...mockCustomer,
				given_name: 'Johnny',
				updated_at: '2024-01-02T12:00:00Z',
			};
			mockApiRequest.mockResolvedValueOnce({ customer: updatedCustomer });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput('update', {
					customerId: 'JDKYHBWT1D4F8MFH63DBMEN8Y4',
					updateFields: {
						given_name: 'Johnny',
					},
				}),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'PUT',
				uri: 'https://connect.squareup.com/v2/customers/JDKYHBWT1D4F8MFH63DBMEN8Y4',
				body: { given_name: 'Johnny' },
				json: true,
				headers: { 'Content-Type': 'application/json' },
			});
			expect(result[0]).toEqual([
				{
					json: { customer: updatedCustomer },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should delete a customer', async () => {
			mockApiRequest.mockResolvedValueOnce({});

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput('delete', {
					customerId: 'JDKYHBWT1D4F8MFH63DBMEN8Y4',
				}),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'DELETE',
				uri: 'https://connect.squareup.com/v2/customers/JDKYHBWT1D4F8MFH63DBMEN8Y4',
				body: {},
				json: true,
				headers: { 'Content-Type': 'application/json' },
			});
			expect(result[0]).toEqual([
				{
					json: {},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('Invoice Operations', () => {
		const mockInvoice = {
			id: 'inv_123456',
			version: 1,
			location_id: 'loc_123456',
			payment_requests: [],
			status: 'DRAFT',
			created_at: '2024-01-01T12:00:00Z',
			updated_at: '2024-01-01T12:00:00Z',
		};

		it('should create an invoice', async () => {
			mockApiRequest.mockResolvedValueOnce({ invoice: mockInvoice });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput(
					'create',
					{
						location_id: 'loc_123456',
						additionalFields: {
							payment_requests: {
								request: [
									{
										request_type: 'BALANCE',
										due_date: '2024-02-01T12:00:00Z',
										tipping_enabled: false,
									},
								],
							},
						},
					},
					'invoice',
				),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'POST',
				uri: 'https://connect.squareup.com/v2/invoices',
				body: {
					location_id: 'loc_123456',
					payment_requests: {
						request: [
							{
								request_type: 'BALANCE',
								due_date: '2024-02-01T12:00:00Z',
								tipping_enabled: false,
							},
						],
					},
				},
				json: true,
				headers: { 'Content-Type': 'application/json' },
				qs: undefined,
			});
			expect(result[0]).toEqual([
				{
					json: { invoice: mockInvoice },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should get an invoice', async () => {
			mockApiRequest.mockResolvedValueOnce({ invoice: mockInvoice });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput(
					'get',
					{
						invoiceId: 'inv_123456',
					},
					'invoice',
				),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'GET',
				uri: 'https://connect.squareup.com/v2/invoices/inv_123456',
				json: true,
				headers: { 'Content-Type': 'application/json' },
				body: {},
			});
			expect(result[0]).toEqual([
				{
					json: { invoice: mockInvoice },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should update an invoice', async () => {
			const updatedInvoice = {
				...mockInvoice,
				payment_requests: [
					{
						request_type: 'BALANCE',
						due_date: '2024-03-01T12:00:00Z',
						tipping_enabled: true,
					},
				],
				updated_at: '2024-01-02T12:00:00Z',
			};
			mockApiRequest.mockResolvedValueOnce({ invoice: updatedInvoice });

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput(
					'update',
					{
						invoiceId: 'inv_123456',
						version: 1,
						updateFields: {
							payment_requests: {
								request: [
									{
										request_type: 'BALANCE',
										due_date: '2024-03-01T12:00:00Z',
										tipping_enabled: true,
									},
								],
							},
						},
					},
					'invoice',
				),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'PUT',
				uri: 'https://connect.squareup.com/v2/invoices/inv_123456',
				body: {
					invoice: {
						version: 1,
						payment_requests: {
							request: [
								{
									request_type: 'BALANCE',
									due_date: '2024-03-01T12:00:00Z',
									tipping_enabled: true,
								},
							],
						},
					},
				},
				json: true,
				headers: { 'Content-Type': 'application/json' },
				qs: undefined,
			});
			expect(result[0]).toEqual([
				{
					json: { invoice: updatedInvoice },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should delete an invoice', async () => {
			mockApiRequest.mockResolvedValueOnce({});

			const result = await Helpers.executeNode(getNode(mockApiRequest), [
				getInput(
					'delete',
					{
						invoiceId: 'inv_123456',
						version: 1,
					},
					'invoice',
				),
			]);

			expect(mockApiRequest).toHaveBeenCalledWith('squareApi', {
				method: 'DELETE',
				uri: 'https://connect.squareup.com/v2/invoices/inv_123456',
				body: { version: 1 },
				json: true,
				headers: { 'Content-Type': 'application/json' },
			});
			expect(result[0]).toEqual([
				{
					json: {},
					pairedItem: { item: 0 },
				},
			]);
		});
	});
});

function getNode(mockApiRequest: jest.Mock) {
	const node: IExecuteFunctions = {
		helpers: {
			requestWithAuthentication: mockApiRequest,
		},
		getCredentials: async () => ({
			accessToken: 'test-token',
			environment: 'sandbox',
		}),
		getNodeParameter: (parameterName: string, itemIndex: number, fallbackValue?: any) => {
			const input = testInputs[itemIndex];
			if (parameterName === 'resource') return input.json.resource;
			if (parameterName === 'operation') return input.json.operation;
			return input.json[parameterName] || fallbackValue;
		},
	} as any;

	return node;
}

let testInputs: INodeExecutionData[] = [];

function getInput(
	operation: string,
	parameters: object,
	resource: string = 'customer',
): INodeExecutionData {
	const input = {
		json: {
			resource,
			operation,
			...parameters,
		},
	};
	testInputs = [input];
	return input;
}
