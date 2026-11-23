import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { SplitOut } from '../SplitOut.node';

describe.each([1, 1.1])('SplitOut v%s, annotations', (typeVersion) => {
	const { description } = new SplitOut();

	it.each([
		{},
		{ include: 'noOtherFields' },
		{ include: 'allOtherFields' },
		{ include: 'selectedOtherFields', fieldsToInclude: 'name' },
		{ include: '={{ $json.include }}' },
	])('should resolve %j as read-only', (parameters) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
			READ_ONLY_ANNOTATIONS,
		);
	});
});
