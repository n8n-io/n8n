import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Aggregate } from '../Aggregate.node';

describe('Aggregate, annotations', () => {
	const { description } = new Aggregate();

	it.each([
		{},
		{ aggregate: 'aggregateIndividualFields' },
		{ aggregate: 'aggregateAllItemData', include: 'allFields' },
		{ aggregate: 'aggregateAllItemData', include: 'specifiedFields', fieldsToInclude: 'name' },
		{ aggregate: 'aggregateAllItemData', include: 'allFieldsExcept', fieldsToExclude: 'name' },
	])('should resolve %j as read-only', (parameters) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion: 1 })).toEqual(
			READ_ONLY_ANNOTATIONS,
		);
	});
});
