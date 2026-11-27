import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { If } from '../If.node';

describe('If, annotations', () => {
	const ifNode = new If();

	it.each(['all', 'any'])(
		'should resolve v1 with combineOperation=%s as read-only',
		(combineOperation) => {
			const { description } = ifNode.getNodeType(1);

			expect(
				resolveNodeAnnotations(description, { parameters: { combineOperation }, typeVersion: 1 }),
			).toEqual(READ_ONLY_ANNOTATIONS);
		},
	);

	it.each([2, 2.1, 2.2, 2.3, 2.4])('should resolve v%s as read-only', (typeVersion) => {
		const { description } = ifNode.getNodeType(typeVersion);

		expect(resolveNodeAnnotations(description, { parameters: {}, typeVersion })).toEqual(
			READ_ONLY_ANNOTATIONS,
		);
	});
});
