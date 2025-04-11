import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getModels } from '../../Perplexity/GenericFunctions';
import { Perplexity } from '../../Perplexity/Perplexity.node';
import { description } from '../descriptions/chat/complete.operation';

jest.mock('../../Perplexity/GenericFunctions', () => ({
	getModels: jest.fn(),
}));

describe('Perplexity Node', () => {
	let node: Perplexity;

	beforeEach(() => {
		node = new Perplexity();
	});

	describe('Node Description', () => {
		it('should correctly include chat completion properties', () => {
			const properties = node.description.properties;

			expect(properties).toEqual(expect.arrayContaining(description));
		});
	});

	describe('Methods', () => {
		it('should call getModels from methods', async () => {
			const mockModels = ['model1', 'model2'];
			(getModels as jest.Mock).mockResolvedValue(mockModels);

			const mockContext = {
				helpers: {
					requestWithAuthentication: jest.fn(),
					httpRequest: jest.fn(),
				},
				getNodeParameter: jest.fn(),
				getCurrentNodeParameter: jest.fn(),
				getCurrentNodeParameters: jest.fn(),
				getCredentials: jest.fn(),
			} as unknown as ILoadOptionsFunctions;

			const result = await node.methods.listSearch.getModels.call(mockContext);

			expect(getModels).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockModels);
		});

		it('should throw an error if getModels fails', async () => {
			(getModels as jest.Mock).mockRejectedValue(new Error('Failed to fetch models'));

			const mockContext = {
				helpers: {
					requestWithAuthentication: jest.fn(),
					httpRequest: jest.fn(),
				},
				getNodeParameter: jest.fn(),
				getCurrentNodeParameter: jest.fn(),
				getCurrentNodeParameters: jest.fn(),
				getCredentials: jest.fn(),
			} as unknown as ILoadOptionsFunctions;

			await expect(node.methods.listSearch.getModels.call(mockContext)).rejects.toThrow(
				'Failed to fetch models',
			);
		});
	});
});
