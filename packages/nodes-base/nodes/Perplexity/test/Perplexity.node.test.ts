import { Perplexity } from '../../Perplexity/Perplexity.node';
import { description } from '../descriptions/chat/complete.operation';
import type * as _importType0 from '../../Perplexity/GenericFunctions';

vi.mock('../../Perplexity/GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../Perplexity/GenericFunctions')),
	getAgentModels: vi.fn(),
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
