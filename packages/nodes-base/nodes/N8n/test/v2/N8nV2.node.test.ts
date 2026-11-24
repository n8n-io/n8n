import { N8nV2 } from '../../v2/N8nV2.node';

describe('N8nV2', () => {
	const { description, methods } = new N8nV2({
		displayName: 'n8n',
		name: 'n8n',
		group: ['transform'],
		description: 'Handle events and perform actions on your n8n instance',
	});

	it('should set the n8n node client header in the request defaults', () => {
		expect(description.requestDefaults?.headers).toMatchObject({ 'x-n8n-client': 'n8n-node' });
	});

	it('should define each search list method that a resource locator uses', () => {
		const fields = description.properties.flatMap((property) => [
			property,
			...(property.options ?? []).filter((option) => 'type' in option),
		]);
		const missing = fields
			.flatMap(({ modes }) => modes ?? [])
			.map(({ typeOptions }) => typeOptions?.searchListMethod)
			.filter((name) => name !== undefined && !(name in methods.listSearch));

		expect(missing).toEqual([]);
	});
});
