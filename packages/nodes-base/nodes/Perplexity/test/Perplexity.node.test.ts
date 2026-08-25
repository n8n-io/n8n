import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { description } from '../descriptions/chat/complete.operation';
import type * as _importType0 from '../GenericFunctions';
import { Perplexity } from '../Perplexity.node';
import { PerplexityV2 } from '../v2/PerplexityV2.node';
import { PerplexityV3 } from '../v3/PerplexityV3.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	getAgentModels: vi.fn(),
}));

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Perplexity',
	name: 'perplexity',
	group: ['transform'],
	description: 'test',
	defaultVersion: 3,
};

describe('Perplexity Node', () => {
	describe('VersionedNodeType shell', () => {
		it('should expose v1, v2, and v3 with defaultVersion 3', () => {
			const node = new Perplexity();

			expect(node.currentVersion).toBe(3);
			expect(Object.keys(node.nodeVersions).map(Number).sort()).toEqual([1, 2, 3]);
		});
	});

	describe('PerplexityV2', () => {
		let v2: PerplexityV2;

		beforeEach(() => {
			v2 = new PerplexityV2(baseDescription);
		});

		it('should correctly include chat completion properties', () => {
			expect(v2.description.properties).toEqual(expect.arrayContaining(description));
		});

		// Flipping this default would reroute saved workflows that omit the
		// parameter because it matched the default at save time
		it('should keep the v2 Resource selector defaulted to chat', () => {
			const v2Resource = v2.description.properties.find(
				(p) =>
					p.name === 'resource' &&
					p.type === 'options' &&
					p.displayOptions?.show?.['@version']?.includes(2),
			);

			expect(v2Resource).toBeDefined();
			expect(v2Resource?.default).toBe('chat');
		});

		it('should keep the v1 Resource selector defaulted to chat', () => {
			const v1Resource = v2.description.properties.find(
				(p) =>
					p.name === 'resource' &&
					p.type === 'hidden' &&
					p.displayOptions?.show?.['@version']?.includes(1),
			);

			expect(v1Resource).toBeDefined();
			expect(v1Resource?.default).toBe('chat');
		});

		it('should include a Chat deprecation notice on v1 and v2', () => {
			const chatDeprecationNotice = v2.description.properties.find(
				(p) => p.name === 'chatDeprecationNotice' && p.type === 'notice',
			);

			expect(chatDeprecationNotice).toBeDefined();
			expect(chatDeprecationNotice?.displayOptions?.show?.resource).toEqual(['chat']);
			expect(chatDeprecationNotice?.displayOptions?.show?.['@version']).toEqual([1, 2]);
			expect(chatDeprecationNotice?.displayName).toMatch(/September 27, 2026/);
			expect(chatDeprecationNotice?.displayName).toMatch(
				/docs\.perplexity\.ai\/docs\/agent-api\/migrate-from-sonar/,
			);
		});
	});

	describe('PerplexityV3', () => {
		let v3: PerplexityV3;

		beforeEach(() => {
			v3 = new PerplexityV3(baseDescription);
		});

		it('should default the Resource selector to agent', () => {
			const resource = v3.description.properties.find(
				(p) => p.name === 'resource' && p.type === 'options',
			);

			expect(resource).toBeDefined();
			expect(resource?.default).toBe('agent');
		});

		it('should not include the Chat resource', () => {
			const resource = v3.description.properties.find(
				(p) => p.name === 'resource' && p.type === 'options',
			);
			const values = (resource?.options ?? []).map((o) => (o as { value: string }).value);

			expect(values).toEqual(expect.arrayContaining(['agent', 'embedding', 'search']));
			expect(values).not.toContain('chat');
		});

		it('should not include a Chat deprecation notice', () => {
			const chatDeprecationNotice = v3.description.properties.find(
				(p) => p.name === 'chatDeprecationNotice',
			);

			expect(chatDeprecationNotice).toBeUndefined();
		});

		it('should not carry over any Chat properties', () => {
			const chatProperties = v3.description.properties.filter((p) =>
				p.displayOptions?.show?.resource?.includes('chat'),
			);

			expect(chatProperties).toEqual([]);
		});
	});
});
