import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

jest.mock(
	'n8n-workflow',
	() => ({
		NodeConnectionTypes: { Main: 'main' },
		NodeApiError: class NodeApiError extends Error {},
		NodeOperationError: class NodeOperationError extends Error {},
	}),
	{ virtual: true },
);

import * as GenericFunctions from '../GenericFunctions';
import { Intercom } from '../Intercom.node';

jest.mock('../GenericFunctions', () => ({
	intercomApiRequest: jest.fn(),
	intercomApiRequestAllItems: jest.fn(),
	validateJSON: jest.fn((value: string) => JSON.parse(value)),
}));

describe('Intercom', () => {
	let node: Intercom;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;

	const intercomApiRequestSpy = jest.spyOn(GenericFunctions, 'intercomApiRequest');

	beforeEach(() => {
		node = new Intercom();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Intercom Test',
			type: 'n8n-nodes-base.intercom',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: unknown[], options: { itemData?: { item: number } }) =>
				data.map((item, index) => ({
					...(item as object),
					pairedItem: { item: options?.itemData?.item ?? index },
				})),
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
			(data: unknown) => [{ json: data }],
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('updates a user by Intercom ID via the contacts endpoint', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const parameters: Record<string, unknown> = {
				resource: 'user',
				operation: 'update',
				updateBy: 'id',
				value: 'contact-123',
				additionalFields: {
					userId: 'external-123',
					name: 'Jane Doe',
					avatar: 'https://example.com/avatar.png',
				},
				jsonParameters: false,
				customAttributesUi: { customAttributesValues: [] },
			};

			return parameters[parameterName];
		});

		intercomApiRequestSpy.mockResolvedValueOnce({ id: 'contact-123', name: 'Jane Doe' });

		const result = await node.execute.call(mockExecuteFunctions);

		expect(intercomApiRequestSpy).toHaveBeenCalledWith('/contacts/contact-123', 'PUT', {
			role: 'user',
			external_id: 'external-123',
			name: 'Jane Doe',
			avatar: 'https://example.com/avatar.png',
			custom_attributes: {},
		}, {});
		expect(result).toEqual([
			[
				{
					json: { id: 'contact-123', name: 'Jane Doe' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('looks up a user by external ID before updating', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const parameters: Record<string, unknown> = {
				resource: 'user',
				operation: 'update',
				updateBy: 'userId',
				value: 'external-123',
				additionalFields: {
					name: 'Jane Doe',
				},
				jsonParameters: false,
				customAttributesUi: { customAttributesValues: [] },
			};

			return parameters[parameterName];
		});

		intercomApiRequestSpy
			.mockResolvedValueOnce({ id: 'contact-123' })
			.mockResolvedValueOnce({ id: 'contact-123', name: 'Jane Doe' });

		await node.execute.call(mockExecuteFunctions);

		expect(intercomApiRequestSpy).toHaveBeenNthCalledWith(
			1,
			'/contacts/find_by_external_id/external-123',
			'GET',
		);
		expect(intercomApiRequestSpy).toHaveBeenNthCalledWith(2, '/contacts/contact-123', 'PUT', {
			role: 'user',
			name: 'Jane Doe',
			custom_attributes: {},
		}, {});
	});

	it('looks up a user by email before updating', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const parameters: Record<string, unknown> = {
				resource: 'user',
				operation: 'update',
				updateBy: 'email',
				value: 'jane@example.com',
				additionalFields: {
					name: 'Jane Doe',
				},
				jsonParameters: false,
				customAttributesUi: { customAttributesValues: [] },
			};

			return parameters[parameterName];
		});

		intercomApiRequestSpy
			.mockResolvedValueOnce({ data: [{ id: 'contact-123' }] })
			.mockResolvedValueOnce({ id: 'contact-123', name: 'Jane Doe' });

		await node.execute.call(mockExecuteFunctions);

		expect(intercomApiRequestSpy).toHaveBeenNthCalledWith(1, '/contacts/search', 'POST', {
			query: {
				field: 'email',
				operator: '=',
				value: 'jane@example.com',
			},
		});
		expect(intercomApiRequestSpy).toHaveBeenNthCalledWith(2, '/contacts/contact-123', 'PUT', {
			role: 'user',
			name: 'Jane Doe',
			custom_attributes: {},
		}, {});
	});
});
