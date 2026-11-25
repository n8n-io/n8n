import { N8n } from '../N8n.node';

describe('n8n versioned node', () => {
	const node = new N8n();

	it('has version 1 as the only and default version', () => {
		expect(Object.keys(node.nodeVersions)).toEqual(['1']);
		expect(node.description.defaultVersion).toBe(1);
		expect(node.getNodeType().description.version).toBe(1);
	});

	it('keeps the name, icon and credential of version 1', () => {
		const { description } = node.getNodeType(1);

		expect(description).toMatchObject({
			displayName: 'n8n',
			name: 'n8n',
			icon: 'node:n8n',
			group: ['transform'],
			defaults: { name: 'n8n' },
			credentials: [{ name: 'n8nApi', required: true }],
		});
	});
});
