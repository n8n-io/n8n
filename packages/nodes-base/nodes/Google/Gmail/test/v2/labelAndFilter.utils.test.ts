import {
	assertSingleUserLabel,
	buildFilterAction,
	buildFilterBody,
	buildFilterCriteria,
	filterMatchesBody,
	isSystemLabelId,
} from '../../v2/utils/filter';
import {
	buildLabelCreateBody,
	buildLabelUpdateBody,
	composeNestedLabelName,
	parseLabelHierarchy,
	resolveParentLabels,
} from '../../v2/utils/label';

describe('Gmail label utils', () => {
	describe('composeNestedLabelName', () => {
		it('returns the name when no parent is set', () => {
			expect(composeNestedLabelName('invoices')).toBe('invoices');
		});

		it('ignores leading and trailing slashes on the parent', () => {
			expect(composeNestedLabelName('1067', '/Jobs/')).toBe('Jobs/1067');
		});

		it('composes Parent/Child when a parent is set', () => {
			expect(composeNestedLabelName('Projects', 'Work')).toBe('Work/Projects');
		});

		it('supports deeper nesting via an already-nested parent name', () => {
			expect(composeNestedLabelName('Q1', 'Work/Projects')).toBe('Work/Projects/Q1');
		});

		it('rejects names that contain a slash', () => {
			expect(() => composeNestedLabelName('Work/Projects')).toThrow('must not contain "/"');
		});

		it('rejects empty names', () => {
			expect(() => composeNestedLabelName('   ')).toThrow('Label name is required');
		});
	});

	describe('buildLabelCreateBody', () => {
		it('builds a create body with visibility defaults', () => {
			expect(buildLabelCreateBody({ name: 'invoices' })).toEqual({
				name: 'invoices',
				labelListVisibility: 'labelShow',
				messageListVisibility: 'show',
			});
		});

		it('includes color when both values are provided', () => {
			expect(
				buildLabelCreateBody({
					name: 'Projects',
					parentName: 'Work',
					color: { textColor: '#ffffff', backgroundColor: '#4986e7' },
				}),
			).toEqual({
				name: 'Work/Projects',
				labelListVisibility: 'labelShow',
				messageListVisibility: 'show',
				color: { textColor: '#ffffff', backgroundColor: '#4986e7' },
			});
		});
	});

	describe('buildLabelUpdateBody', () => {
		it('builds a patch body from update fields', () => {
			expect(
				buildLabelUpdateBody({
					name: 'Work/Archive',
					labelListVisibility: 'labelHide',
				}),
			).toEqual({
				name: 'Work/Archive',
				labelListVisibility: 'labelHide',
			});
		});

		it('requires both color fields together', () => {
			expect(() => buildLabelUpdateBody({ textColor: '#ffffff' })).toThrow(
				'Both Text Color and Background Color',
			);
		});

		it('rejects an empty update', () => {
			expect(() => buildLabelUpdateBody({})).toThrow('At least one update field must be set');
		});
	});

	describe('parseLabelHierarchy', () => {
		it('parses nested label metadata', () => {
			expect(
				parseLabelHierarchy({
					id: 'Label_2',
					name: 'Work/Projects',
					type: 'user',
				}),
			).toEqual({
				id: 'Label_2',
				name: 'Work/Projects',
				type: 'user',
				leafName: 'Projects',
				parentName: 'Work',
				depth: 1,
			});
		});

		it('returns null parent for top-level labels', () => {
			expect(
				parseLabelHierarchy({
					id: 'Label_1',
					name: 'Work',
					type: 'user',
				}),
			).toMatchObject({
				leafName: 'Work',
				parentName: null,
				depth: 0,
			});
		});
	});
});

describe('Gmail filter utils', () => {
	describe('isSystemLabelId', () => {
		it('recognizes system labels', () => {
			expect(isSystemLabelId('INBOX')).toBe(true);
			expect(isSystemLabelId('STARRED')).toBe(true);
			expect(isSystemLabelId('Label_1')).toBe(false);
		});
	});

	describe('assertSingleUserLabel', () => {
		it('allows one user label with system labels', () => {
			expect(() => assertSingleUserLabel(['Label_1', 'STARRED', 'IMPORTANT'])).not.toThrow();
		});

		it('rejects more than one user label', () => {
			expect(() => assertSingleUserLabel(['Label_1', 'Label_2'])).toThrow(
				'at most one user-defined label',
			);
		});
	});

	describe('buildFilterBody', () => {
		it('builds criteria and action', () => {
			expect(
				buildFilterBody(
					{ from: 'sender@example.com', hasAttachment: true },
					{ addLabelIds: ['Label_1'], removeLabelIds: ['INBOX'] },
				),
			).toEqual({
				criteria: {
					from: 'sender@example.com',
					hasAttachment: true,
				},
				action: {
					addLabelIds: ['Label_1'],
					removeLabelIds: ['INBOX'],
				},
			});
		});

		it('requires at least one criterion', () => {
			expect(() => buildFilterBody({}, { addLabelIds: ['STARRED'] })).toThrow(
				'At least one filter criterion',
			);
		});

		it('requires at least one action', () => {
			expect(() => buildFilterBody({ from: 'a@b.com' }, {})).toThrow('At least one filter action');
		});
	});

	describe('buildFilterCriteria / buildFilterAction', () => {
		it('omits empty criteria fields', () => {
			expect(buildFilterCriteria({ from: 'a@b.com', subject: '' })).toEqual({
				from: 'a@b.com',
			});
		});

		it('includes forward action', () => {
			expect(buildFilterAction({ forward: 'alias@example.com' })).toEqual({
				forward: 'alias@example.com',
			});
		});
	});
});

describe('filterMatchesBody', () => {
	const body = {
		criteria: { from: 'a@example.com', subject: 'invoice' },
		action: { addLabelIds: ['STARRED', 'Label_1'] },
	};

	it('ignores key order, label order, and the filter id', () => {
		expect(
			filterMatchesBody(
				{
					id: 'filter-1',
					action: { addLabelIds: ['Label_1', 'STARRED'] },
					criteria: { subject: 'invoice', from: 'a@example.com' },
				},
				body,
			),
		).toBe(true);
	});

	it('detects a changed action', () => {
		expect(
			filterMatchesBody({ criteria: body.criteria, action: { addLabelIds: ['STARRED'] } }, body),
		).toBe(false);
	});
});

describe('resolveParentLabels', () => {
	it('lists every missing level, outermost first', () => {
		expect(resolveParentLabels(['Inbox'], 'Jobs/2026/Q1')).toEqual({
			parentPath: 'Jobs/2026/Q1',
			missing: ['Jobs', 'Jobs/2026', 'Jobs/2026/Q1'],
		});
	});

	it('reuses the casing of existing levels', () => {
		expect(resolveParentLabels(['jobs', 'jobs/2026'], 'JOBS/2026/Q1')).toEqual({
			parentPath: 'jobs/2026/Q1',
			missing: ['jobs/2026/Q1'],
		});
	});

	it('returns nothing to create when the parent exists', () => {
		expect(resolveParentLabels(['Jobs'], 'Jobs')).toEqual({ parentPath: 'Jobs', missing: [] });
	});
});

describe('filter booleans', () => {
	it('omits false booleans, which Gmail does not store', () => {
		expect(buildFilterCriteria({ query: 'x', hasAttachment: false, excludeChats: false })).toEqual({
			query: 'x',
		});
	});

	it('treats a false boolean like an unset field when comparing', () => {
		expect(
			filterMatchesBody(
				{ criteria: { query: 'x' }, action: { addLabelIds: ['Label_1'] } },
				{ criteria: { query: 'x', hasAttachment: false }, action: { addLabelIds: ['Label_1'] } },
			),
		).toBe(true);
	});
});
