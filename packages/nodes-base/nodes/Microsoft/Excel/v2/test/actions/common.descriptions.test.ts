import type { INode, INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { tableRLC, workbookRLC, worksheetRLC } from '../../actions/common.descriptions';

const node: INode = {
	id: 'test-node',
	name: 'Test Excel Node',
	type: 'n8n-nodes-base.microsoftExcel',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

const issuesFor = (property: INodeProperties, value: string) =>
	NodeHelpers.getParameterIssues(
		property,
		{ [property.name]: { __rl: true, mode: 'id', value } },
		'',
		node,
		null,
	).parameters ?? {};

// getParameterIssues anchors a mode's regex with `^…$`, so each pattern must match a whole ID.
describe('Microsoft Excel resource locators, By ID mode', () => {
	describe('Workbook', () => {
		it.each([
			['a work account item ID', '01ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'],
			['a personal account item ID', 'A1B2C3D4E5F60718!s0123456789abcdef0123456789abcdef'],
			['a legacy personal account item ID', 'A1B2C3D4E5F60718!123'],
			['a percent-encoded separator', 'A1B2C3D4E5F60718%21s0123456789abcdef0123456789abcdef'],
		])('accepts %s', (_label, value) => {
			expect(issuesFor(workbookRLC, value)).toEqual({});
		});

		it.each([
			['a path separator', 'A1B2C3D4E5F60718/children'],
			['parent directory traversal', '../drives'],
			['a trailing separator', 'A1B2C3D4E5F60718!'],
			['a space', 'A1B2C3D4E5 F60718'],
		])('rejects %s', (_label, value) => {
			expect(issuesFor(workbookRLC, value)).toEqual({
				workbook: ['Not a valid Workbook ID'],
			});
		});

		it('reports an empty ID as missing, because the field is required', () => {
			expect(issuesFor(workbookRLC, '')).toEqual({
				workbook: ['Parameter "Workbook" is required.', 'Not a valid Workbook ID'],
			});
		});
	});

	describe('Sheet and Table', () => {
		it('accepts a Sheet ID', () => {
			expect(issuesFor(worksheetRLC, '{00000000-0001-0000-0000-000000000000}')).toEqual({});
		});

		it('accepts a Table ID', () => {
			expect(issuesFor(tableRLC, '{21EAB2B0-DD1A-4E5B-9931-1C4D8A0D7A31}')).toEqual({});
		});
	});
});
