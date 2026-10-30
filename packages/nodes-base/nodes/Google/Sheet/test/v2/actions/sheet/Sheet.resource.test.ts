import { displayParameter, type INodeProperties } from 'n8n-workflow';

import { descriptions } from '../../../../v2/actions/sheet/Sheet.resource';

describe('Google Sheets, Sheet selector visibility', () => {
	const node = { typeVersion: 4.7 };
	const sheetName = descriptions.find((p) => p.name === 'sheetName') as INodeProperties;

	const isShown = (values: Record<string, unknown>) =>
		displayParameter(values, sheetName, node, null);

	it('shows the Sheet selector for a single-sheet read', () => {
		expect(isShown({ resource: 'sheet', operation: 'read', sheetSelectionMode: 'single' })).toBe(
			true,
		);
	});

	it('hides the Sheet selector for an All Sheets read', () => {
		expect(isShown({ resource: 'sheet', operation: 'read', sheetSelectionMode: 'all' })).toBe(
			false,
		);
	});

	it('shows the Sheet selector for other operations that still need a single sheet', () => {
		for (const operation of ['append', 'appendOrUpdate', 'clear', 'delete', 'remove', 'update']) {
			expect(isShown({ resource: 'sheet', operation })).toBe(true);
		}
	});
});
