import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Html } from '../Html.node';

describe.each([1, 1.1, 1.2, 1.3])('HTML v%s, annotations', (typeVersion) => {
	const { description } = new Html();

	it.each([
		{},
		{ operation: 'generateHtmlTemplate' },
		{ operation: 'extractHtmlContent' },
		{ operation: 'convertToHtmlTable' },
	])('should resolve %j as read-only', (parameters) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
			READ_ONLY_ANNOTATIONS,
		);
	});
});
