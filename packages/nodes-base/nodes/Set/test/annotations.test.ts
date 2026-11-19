import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Set } from '../Set.node';

describe('Set, annotations', () => {
	const setNode = new Set();

	it.each([1, 2, 3, 3.1, 3.2, 3.3, 3.4, 3.5])(
		'should resolve the default configuration of version %s as read-only',
		(typeVersion) => {
			const { description } = setNode.getNodeType(typeVersion);

			expect(resolveNodeAnnotations(description, { parameters: {}, typeVersion })).toEqual(
				READ_ONLY_ANNOTATIONS,
			);
		},
	);

	describe.each([1, 2])('version %s', (typeVersion) => {
		it.each([false, true])('should resolve keepOnlySet=%s as read-only', (keepOnlySet) => {
			const { description } = setNode.getNodeType(typeVersion);

			expect(
				resolveNodeAnnotations(description, { parameters: { keepOnlySet }, typeVersion }),
			).toEqual(READ_ONLY_ANNOTATIONS);
		});
	});

	describe.each([3, 3.1, 3.2, 3.3, 3.4, 3.5])('version %s', (typeVersion) => {
		const { description } = setNode.getNodeType(typeVersion);
		const noInputFields = typeVersion < 3.3 ? { include: 'none' } : { includeOtherFields: false };

		describe.each(['manual', 'raw'])('%s mode', (mode) => {
			it.each([
				{},
				noInputFields,
				{ include: 'all', includeOtherFields: true },
				{ include: 'selected', includeOtherFields: true, includeFields: 'field' },
				{ include: 'except', includeOtherFields: true, excludeFields: 'field' },
			])('should resolve %j as read-only', (parameters) => {
				expect(
					resolveNodeAnnotations(description, {
						parameters: { mode, ...parameters },
						typeVersion,
					}),
				).toEqual(READ_ONLY_ANNOTATIONS);
			});
		});
	});
});
