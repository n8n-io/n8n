import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { freshserviceApiRequest } from '../GenericFunctions';

describe('Freshservice GenericFunctions', () => {
	const node: INode = {
		id: 'ac1f4e1a-9b1c-4a2f-9f0a-2c2f1a1b9d3e',
		name: 'Freshservice',
		type: 'n8n-nodes-base.freshservice',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(node);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			domain: 'test-domain',
		});
	});

	describe('freshserviceApiRequest', () => {
		it('reports a validation error with the field and the message', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({
				error: {
					description: 'Validation failed',
					errors: [{ field: 'email', message: 'It is not a valid email' }],
				},
			});

			await expect(
				freshserviceApiRequest.call(mockExecuteFunctions, 'POST', '/tickets'),
			).rejects.toMatchObject({
				message: 'Please check your parameters',
				description: 'For email: It is not a valid email',
			});
		});

		it('throws a NodeApiError when the error has no payload', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('socket hang up'));

			const call = freshserviceApiRequest.call(mockExecuteFunctions, 'POST', '/tickets');

			await expect(call).rejects.toBeInstanceOf(NodeApiError);
			await expect(call).rejects.not.toBeInstanceOf(TypeError);
		});

		it('throws a NodeApiError when the validation payload has no errors array', async () => {
			mockExecuteFunctions.helpers.request.mockRejectedValue({
				error: { description: 'Validation failed' },
			});

			await expect(
				freshserviceApiRequest.call(mockExecuteFunctions, 'POST', '/tickets'),
			).rejects.toBeInstanceOf(NodeApiError);
		});
	});
});
