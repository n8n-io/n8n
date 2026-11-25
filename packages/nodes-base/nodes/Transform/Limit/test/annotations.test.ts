import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Limit } from '../Limit.node';

describe('Limit, annotations', () => {
	const { description } = new Limit();

	it.each([{}, { keep: 'firstItems' }, { keep: 'lastItems' }])(
		'should resolve %j as read-only',
		(parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion: 1 })).toEqual(
				READ_ONLY_ANNOTATIONS,
			);
		},
	);
});
