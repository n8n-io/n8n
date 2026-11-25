import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { SplitInBatches } from '../SplitInBatches.node';

describe('SplitInBatches, annotations', () => {
	const splitInBatches = new SplitInBatches();

	describe.each([1, 2, 3])('v%s', (typeVersion) => {
		const { description } = splitInBatches.getNodeType(typeVersion);

		it.each([{}, { batchSize: 5 }, { options: { reset: false } }, { options: { reset: true } }])(
			'should resolve %j as read-only',
			(parameters) => {
				expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
					READ_ONLY_ANNOTATIONS,
				);
			},
		);
	});
});
