import { N8nV2 } from '../../v2/N8nV2.node';

describe('N8nV2', () => {
	it('should set the n8n node client header in the request defaults', () => {
		const { description } = new N8nV2({
			displayName: 'n8n',
			name: 'n8n',
			group: ['transform'],
			description: 'Handle events and perform actions on your n8n instance',
		});

		expect(description.requestDefaults?.headers).toMatchObject({ 'x-n8n-client': 'n8n-node' });
	});
});
