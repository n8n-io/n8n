import type { INodeProperties } from 'n8n-workflow';

import { LinearV2 } from '../../../v2/LinearV2.node';

describe('Linear v2 → resource locators', () => {
	const node = new LinearV2({
		displayName: 'Linear',
		name: 'linear',
		group: [],
		description: 'Consume Linear API',
	});
	const locators = node.description.properties.flatMap(function collect(
		property: INodeProperties,
	): INodeProperties[] {
		const nested = (property.options ?? []).flatMap((option) =>
			'name' in option && 'type' in option ? collect(option as INodeProperties) : [],
		);
		return property.type === 'resourceLocator' ? [property, ...nested] : nested;
	});

	it('registers a listSearch method for every locator list mode', () => {
		const registered = Object.keys(node.methods.listSearch);
		const used = locators.flatMap(
			(locator) =>
				locator.modes
					?.filter((mode) => mode.type === 'list')
					.map((mode) => mode.typeOptions?.searchListMethod as string) ?? [],
		);

		expect(used.length).toBeGreaterThan(0);
		expect([...new Set(used)].filter((method) => !registered.includes(method))).toEqual([]);
	});

	it('exposes searchable list and manual ID modes on every locator', () => {
		for (const locator of locators) {
			const modes = locator.modes?.map((mode) => mode.name) ?? [];
			expect(modes).toContain('list');
			expect(modes).toContain('id');
		}
	});

	it('never marks a locator inside a collection as required', () => {
		const requiredNested = node.description.properties
			.filter((property) => property.type === 'collection' || property.type === 'fixedCollection')
			.flatMap((property) => (property.options ?? []) as INodeProperties[])
			.filter((option) => option.type === 'resourceLocator' && option.required)
			.map((option) => option.name);

		expect(requiredNested).toEqual([]);
	});
});
