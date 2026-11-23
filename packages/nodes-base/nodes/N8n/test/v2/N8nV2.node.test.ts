import type { INodeProperties } from 'n8n-workflow';

import { N8nV2 } from '../../v2/N8nV2.node';

const searchListMethods = (properties: INodeProperties[]): string[] =>
	properties.flatMap(({ modes, options }) => [
		...(modes ?? []).flatMap(({ typeOptions }) => typeOptions?.searchListMethod ?? []),
		...searchListMethods((options ?? []).filter((option) => 'type' in option)),
	]);

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
		const missing = searchListMethods(description.properties).filter(
			(name) => !(name in methods.listSearch),
		);

		expect(missing).toEqual([]);
	});
});
