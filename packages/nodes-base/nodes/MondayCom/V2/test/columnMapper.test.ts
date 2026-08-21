/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased -- fixtures mimic real monday label text */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	extractMappedValues,
	getColumnFields,
	resolveSubitemBoardId,
} from '../helpers/columnMapper';

const httpRequestWithAuthentication = vi.fn();

function makeContext(boardId = '111', operation = 'createItem') {
	return {
		getCurrentNodeParameter: (name: string) => (name === 'operation' ? operation : boardId),
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
		helpers: { httpRequestWithAuthentication },
	} as any;
}

function mockColumns(columns: unknown[]) {
	httpRequestWithAuthentication.mockResolvedValueOnce({
		data: { boards: [{ columns }] },
	});
}

describe('getColumnFields', () => {
	beforeEach(() => {
		httpRequestWithAuthentication.mockReset();
	});

	it('returns no fields when no board is selected', async () => {
		const result = await getColumnFields.call(makeContext(''));
		expect(result.fields).toEqual([]);
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('excludes the name column and read-only columns on Create', async () => {
		mockColumns([
			{ id: 'name', title: 'Name', type: 'name' },
			{ id: 'formula_1', title: 'Calc', type: 'formula' },
			{ id: 'text_1', title: 'Notes', type: 'text' },
		]);
		const result = await getColumnFields.call(makeContext());
		expect(result.fields.map((field) => field.id)).toEqual(['text_1']);
	});

	it('includes the name column on Update for renames', async () => {
		mockColumns([
			{ id: 'name', title: 'Name', type: 'name' },
			{ id: 'text_1', title: 'Notes', type: 'text' },
		]);
		const result = await getColumnFields.call(makeContext('111', 'updateItem'));
		expect(result.fields.map((field) => field.id)).toEqual(['name', 'text_1']);
	});

	it('maps the SUBITEM board columns for Create Subitem', async () => {
		// First call: parent board columns (with the subtasks column pointing at board 222).
		mockColumns([
			{ id: 'name', title: 'Name', type: 'name' },
			{
				id: 'subtasks_1',
				title: 'Subitems',
				type: 'subtasks',
				settings_str: '{"boardIds":[222]}',
			},
		]);
		// Second call: subitem board columns.
		mockColumns([
			{ id: 'name', title: 'Name', type: 'name' },
			{ id: 'sub_text', title: 'Sub Notes', type: 'text' },
		]);

		const result = await getColumnFields.call(makeContext('111', 'createSubitem'));

		expect(result.fields.map((field) => field.id)).toEqual(['sub_text']);
		const secondCallBody = httpRequestWithAuthentication.mock.calls[1][1].body;
		expect(secondCallBody.variables).toEqual({ ids: ['222'] });
	});

	it('returns a notice when the parent board has no subitems board yet', async () => {
		mockColumns([{ id: 'name', title: 'Name', type: 'name' }]);
		const result = await getColumnFields.call(makeContext('111', 'createSubitem'));
		expect(result.fields).toEqual([]);
		expect(result.emptyFieldsNotice).toMatch(/no subitems yet/i);
	});

	it('resolveSubitemBoardId parses boardIds and tolerates malformed settings', async () => {
		mockColumns([
			{ id: 'subtasks_1', title: 'Subitems', type: 'subtasks', settings_str: '{"boardIds":[333]}' },
		]);
		expect(await resolveSubitemBoardId(makeContext(), '111')).toBe('333');

		mockColumns([
			{ id: 'subtasks_1', title: 'Subitems', type: 'subtasks', settings_str: 'not-json' },
		]);
		expect(await resolveSubitemBoardId(makeContext(), '111')).toBeUndefined();
	});

	it('turns status labels into an options dropdown', async () => {
		mockColumns([
			{
				id: 'status_1',
				title: 'Status',
				type: 'status',
				settings_str: '{"labels": {"0": "Working on it", "1": "Done"}}',
			},
		]);
		const result = await getColumnFields.call(makeContext());
		expect(result.fields[0].type).toBe('options');
		expect(result.fields[0].options).toEqual([
			{ name: 'Working on it', value: 'Working on it' },
			{ name: 'Done', value: 'Done' },
		]);
	});

	it('maps checkbox to boolean, numbers to number, date to dateTime', async () => {
		mockColumns([
			{ id: 'check_1', title: 'Done?', type: 'checkbox' },
			{ id: 'num_1', title: 'Amount', type: 'numbers' },
			{ id: 'date_1', title: 'Due', type: 'date' },
		]);
		const result = await getColumnFields.call(makeContext());
		expect(result.fields.map((field) => field.type)).toEqual(['boolean', 'number', 'dateTime']);
	});

	it('appends format hints to compound-type labels', async () => {
		mockColumns([{ id: 'tl_1', title: 'Timeline', type: 'timeline' }]);
		const result = await getColumnFields.call(makeContext());
		expect(result.fields[0].displayName).toBe('Timeline (YYYY-MM-DD/YYYY-MM-DD)');
	});
});

describe('extractMappedValues', () => {
	it('returns the set values and drops null entries', () => {
		expect(
			extractMappedValues({ mappingMode: 'defineBelow', value: { a: 1, b: null, c: 'x' } }),
		).toEqual({ a: 1, c: 'x' });
	});

	it('handles missing value objects', () => {
		expect(extractMappedValues({ mappingMode: 'defineBelow', value: null })).toEqual({});
		expect(extractMappedValues(undefined)).toEqual({});
	});
});
