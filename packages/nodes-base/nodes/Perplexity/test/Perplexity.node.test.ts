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
});
