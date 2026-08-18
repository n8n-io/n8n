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

		it('should default the v2 Resource selector to agent', () => {
			const v2Resource = node.description.properties.find(
				(p) =>
					p.name === 'resource' &&
					p.type === 'options' &&
					p.displayOptions?.show?.['@version']?.includes(2),
			);

			expect(v2Resource).toBeDefined();
			expect(v2Resource?.default).toBe('agent');
		});

		it('should keep the v1 Resource selector defaulted to chat', () => {
			const v1Resource = node.description.properties.find(
				(p) =>
					p.name === 'resource' &&
					p.type === 'hidden' &&
					p.displayOptions?.show?.['@version']?.includes(1),
			);

			expect(v1Resource).toBeDefined();
			expect(v1Resource?.default).toBe('chat');
		});

		it('should include a Chat deprecation notice on v2', () => {
			const chatDeprecationNotice = node.description.properties.find(
				(p) => p.name === 'chatDeprecationNotice' && p.type === 'notice',
			);

			expect(chatDeprecationNotice).toBeDefined();
			expect(chatDeprecationNotice?.displayOptions?.show?.resource).toEqual(['chat']);
			expect(chatDeprecationNotice?.displayOptions?.show?.['@version']).toEqual([2]);
			expect(chatDeprecationNotice?.displayName).toMatch(/2026-09-27/);
			expect(chatDeprecationNotice?.displayName).toMatch(
				/docs\.perplexity\.ai\/docs\/agent-api\/migrate-from-sonar/,
			);
		});
	});
});
