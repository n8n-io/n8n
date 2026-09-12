/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IDataObject, IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { jsonParse, NodeHelpers } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import {
	buildBulkArchiveOrDeleteMutation,
	buildClearColumnValuesMutation,
	buildGetItemQuery,
	completeMoveColumnsMapping,
	flattenItemColumns,
	formatColumnValueOutput,
	moveItem,
	resolveArchiveOrDeleteAction,
} from '../actions/item/item.execute';
import { MondayComV2 } from '../MondayComV2.node';
import type { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Monday.com',
	name: 'mondayCom',
	group: ['output'],
	description: 'Consume Monday.com API',
};

function makeContext(rawValue: unknown): IExecuteFunctions {
	return {
		getNodeParameter: () => rawValue,
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
	} as unknown as IExecuteFunctions;
}

/** Context whose getNodeParameter resolves from a name → value map. */
function makeParamsContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			params[name] !== undefined ? params[name] : fallback,
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
	} as unknown as IExecuteFunctions;
}

function makeClient(responses: IDataObject[]): {
	client: MondayGraphQLClient;
	execute: ReturnType<typeof vi.fn>;
} {
	let call = 0;
	const execute = vi.fn(async () => responses[Math.min(call++, responses.length - 1)]);
	return { client: { execute } as unknown as MondayGraphQLClient, execute };
}

describe('buildClearColumnValuesMutation', () => {
	it('builds one aliased change_multiple_column_values per item', () => {
		const { query, variables } = buildClearColumnValuesMutation(
			['111', '222'],
			['status', 'text_1'],
		);
		expect(query).toContain(
			'item0: change_multiple_column_values(board_id: $boardId, item_id: $item0, column_values: $columnValues)',
		);
		expect(query).toContain(
			'item1: change_multiple_column_values(board_id: $boardId, item_id: $item1, column_values: $columnValues)',
		);
		expect(query).toContain('$item0: ID!');
		expect(query).toContain('$item1: ID!');
		expect(variables.item0).toBe('111');
		expect(variables.item1).toBe('222');
	});

	it('nulls every selected column in the shared column_values payload', () => {
		const { variables } = buildClearColumnValuesMutation(['111'], ['status', 'text_1', 'date4']);
		expect(jsonParse(variables.columnValues as string)).toEqual({
			status: null,
			text_1: null,
			date4: null,
		});
	});

	it('handles a single item without extra aliases', () => {
		const { query } = buildClearColumnValuesMutation(['111'], ['status']);
		expect(query).toContain('item0:');
		expect(query).not.toContain('item1:');
	});
});

describe('buildGetItemQuery', () => {
	it('requests all columns and no extra fields by default', () => {
		const { query, variables } = buildGetItemQuery('111', {});
		expect(query).toContain('column_values(capabilities: [CALCULATED])');
		expect(query).not.toContain('$columnIds');
		expect(query).not.toContain('creator {');
		expect(query).not.toContain('subitems {');
		expect(query).not.toContain('updates {');
		expect(variables).toEqual({ ids: ['111'] });
	});

	it('scopes column_values to the selected columns', () => {
		const { query, variables } = buildGetItemQuery('111', {
			columnIds: ['status', 'text_1'],
		});
		expect(query).toContain('$columnIds: [String!]');
		expect(query).toContain('column_values(ids: $columnIds, capabilities: [CALCULATED])');
		expect(variables).toEqual({ ids: ['111'], columnIds: ['status', 'text_1'] });
	});

	it('accepts a comma-separated string of column IDs (expression mode)', () => {
		const { variables } = buildGetItemQuery('111', { columnIds: 'status, text_1' });
		expect(variables.columnIds).toEqual(['status', 'text_1']);
	});

	it('adds the excluded metadata fields with Include All Item Info', () => {
		const { query } = buildGetItemQuery('111', { includeAllItemInfo: true });
		expect(query).toContain('creator { id name email }');
		expect(query).toContain('email');
		expect(query).toContain('relative_link');
		expect(query).toContain('subscribers { id name }');
	});

	it('keeps the subitems and updates toggles working', () => {
		const { query } = buildGetItemQuery('111', {
			includeSubitems: true,
			includeUpdates: true,
		});
		expect(query).toContain('subitems { id name state url parent_item { id name } }');
		expect(query).toContain('updates { id body created_at creator { id name } }');
	});

	it('requests the linked-value fragments (dependency/board_relation/mirror have null text)', () => {
		const { query } = buildGetItemQuery('111', {});
		expect(query).toContain('... on DependencyValue { display_value linked_item_ids }');
		expect(query).toContain('... on BoardRelationValue { display_value linked_item_ids }');
		expect(query).toContain('... on MirrorValue { display_value }');
	});
});

describe('buildBulkArchiveOrDeleteMutation', () => {
	it('builds one aliased archive_item per ID for archive', () => {
		const { query, variables } = buildBulkArchiveOrDeleteMutation('archive', ['111', '222']);
		expect(query).toContain('item0: archive_item(item_id: $item0) { id name state }');
		expect(query).toContain('item1: archive_item(item_id: $item1) { id name state }');
		expect(query).toContain('$item0: ID!');
		expect(query).toContain('$item1: ID!');
		expect(query).not.toContain('delete_item');
		expect(variables).toEqual({ item0: '111', item1: '222' });
	});

	it('builds delete_item aliases for delete', () => {
		const { query } = buildBulkArchiveOrDeleteMutation('delete', ['111']);
		expect(query).toContain('item0: delete_item(item_id: $item0) { id name state }');
		expect(query).not.toContain('archive_item');
	});

	it('handles a single item without extra aliases', () => {
		const { query } = buildBulkArchiveOrDeleteMutation('archive', ['111']);
		expect(query).toContain('item0:');
		expect(query).not.toContain('item1:');
	});

	it('scales to the 50-item cap with one variable per ID', () => {
		const ids = Array.from({ length: 50 }, (_, i) => String(1000 + i));
		const { query, variables } = buildBulkArchiveOrDeleteMutation('archive', ids);
		expect(query).toContain('item49: archive_item(item_id: $item49)');
		expect(Object.keys(variables)).toHaveLength(50);
		expect(variables.item49).toBe('1049');
	});
});

describe('formatColumnValueOutput', () => {
	const item = { id: '42', name: 'My Item' };

	it('decodes the raw JSON value and keeps the original string', () => {
		const result = formatColumnValueOutput(
			item,
			{
				id: 'status',
				type: 'status',
				text: 'Done',
				value: '{"index":1,"changed_at":"2026-01-01T00:00:00Z"}',
				column: { title: 'Status' },
			},
			'status',
		);
		expect(result).toEqual({
			itemId: '42',
			itemName: 'My Item',
			columnId: 'status',
			columnTitle: 'Status',
			columnType: 'status',
			text: 'Done',
			value: { index: 1, changed_at: '2026-01-01T00:00:00Z' },
			valueRaw: '{"index":1,"changed_at":"2026-01-01T00:00:00Z"}',
		});
	});

	it('returns nulls for an unset column value', () => {
		const result = formatColumnValueOutput(
			item,
			{ id: 'date4', type: 'date', text: '', value: null, column: { title: 'Due' } },
			'date4',
		);
		expect(result.value).toBeNull();
		expect(result.valueRaw).toBeNull();
		expect(result.text).toBe('');
	});

	it('falls back to the raw string when value is not valid JSON', () => {
		const result = formatColumnValueOutput(
			item,
			{ id: 'x', type: 'text', text: 'hi', value: 'not-json', column: null },
			'x',
		);
		expect(result.value).toBe('not-json');
		expect(result.columnTitle).toBeNull();
	});

	it('renders status rollups (BatteryValue) as label counts with batteryValue/isLeaf', () => {
		const result = formatColumnValueOutput(
			item,
			{
				id: 'status',
				type: 'status',
				text: null,
				value: null,
				column: { title: 'Status', settings_str: '{"labels":{"0":"Working on it","1":"Done"}}' },
				battery_value: [
					{ key: '1', count: 2 },
					{ key: '0', count: 1 },
				],
				is_leaf: false,
			},
			'status',
		);
		expect(result.text).toBe('Done: 2, Working on it: 1');
		expect(result.batteryValue).toEqual([
			{ key: '1', count: 2 },
			{ key: '0', count: 1 },
		]);
		expect(result.isLeaf).toBe(false);
	});

	it('surfaces dependency links via display_value (text/value are null in the API)', () => {
		const result = formatColumnValueOutput(
			item,
			{
				id: 'dep_1',
				type: 'dependency',
				text: null,
				value: null,
				column: { title: 'Depends On' },
				display_value: 'Task A, Task B',
				linked_item_ids: ['11', '22'],
				linked_items: [
					{ id: '11', name: 'Task A' },
					{ id: '22', name: 'Task B' },
				],
				dependency_links: [
					{ linked_item_id: '11', dependency_type: null, lag: null },
					{ linked_item_id: '22', dependency_type: 0, lag: 2 },
				],
			},
			'dep_1',
		);
		expect(result.text).toBe('Task A, Task B');
		expect(result.displayValue).toBe('Task A, Task B');
		expect(result.linkedItemIds).toEqual(['11', '22']);
		expect(result.linkedItems).toEqual([
			{ id: '11', name: 'Task A' },
			{ id: '22', name: 'Task B' },
		]);
		expect(result.dependencyLinks).toEqual([
			{ linked_item_id: '11', dependency_type: null, lag: null },
			{ linked_item_id: '22', dependency_type: 0, lag: 2 },
		]);
	});

	it('keeps text null on an empty board_relation value (display_value "")', () => {
		const result = formatColumnValueOutput(
			item,
			{
				id: 'connect_1',
				type: 'board_relation',
				text: null,
				value: null,
				column: { title: 'Connected' },
				display_value: '',
				linked_item_ids: [],
			},
			'connect_1',
		);
		expect(result.text).toBeNull();
		expect(result.displayValue).toBe('');
		expect(result.linkedItemIds).toEqual([]);
		expect(result.linkedItems).toBeUndefined();
		expect(result.dependencyLinks).toBeUndefined();
	});
});

describe('flattenItemColumns', () => {
	it('flattens by column title with text values', () => {
		expect(
			flattenItemColumns([
				{ id: 'text_1', text: 'hello', column: { title: 'Notes' } },
				{ id: 'num_1', text: '', column: { title: 'Amount' } },
				{ id: 'orphan', text: null, column: null },
			]),
		).toEqual({ Notes: 'hello', Amount: '', orphan: null });
	});

	it('renders battery values through the column status labels', () => {
		expect(
			flattenItemColumns([
				{
					id: 'status',
					text: null,
					column: { title: 'Status', settings_str: '{"labels":{"0":"Stuck","1":"Done"}}' },
					battery_value: [
						{ key: '1', count: 1 },
						{ key: '0', count: 2 },
					],
				},
			]),
		).toEqual({ Status: 'Done: 1, Stuck: 2' });
	});

	it('falls back to display_value for dependency/board_relation/mirror (text is null)', () => {
		expect(
			flattenItemColumns([
				{
					id: 'dep_1',
					text: null,
					column: { title: 'Depends On' },
					display_value: 'Task A, Task B',
				},
				{ id: 'connect_1', text: null, column: { title: 'Connected' }, display_value: '' },
				{ id: 'mirror_1', text: null, column: { title: 'Mirror' }, display_value: 'Done' },
			]),
		).toEqual({ 'Depends On': 'Task A, Task B', Connected: null, Mirror: 'Done' });
	});
});

describe('resolveArchiveOrDeleteAction', () => {
	it('defaults the unified operation to archive (the safe default)', () => {
		const context = makeContext('archive');
		expect(resolveArchiveOrDeleteAction.call(context, 'archiveOrDeleteItem', 0)).toBe('archive');
	});

	it('honors an explicit delete selection', () => {
		const context = makeContext('delete');
		expect(resolveArchiveOrDeleteAction.call(context, 'archiveOrDeleteBoard', 0)).toBe('delete');
	});

	it('falls back to archive for any unexpected parameter value', () => {
		const context = makeContext('something-else');
		expect(resolveArchiveOrDeleteAction.call(context, 'archiveOrDeleteGroup', 0)).toBe('archive');
	});

	it('maps the legacy operation values without reading the parameter', () => {
		const context = makeContext(undefined);
		expect(resolveArchiveOrDeleteAction.call(context, 'archiveItem', 0)).toBe('archive');
		expect(resolveArchiveOrDeleteAction.call(context, 'deleteItem', 0)).toBe('delete');
	});
});

describe('completeMoveColumnsMapping', () => {
	const sourceColumns = [
		{ id: 'name', type: 'name' },
		{ id: 'status', type: 'status' },
		{ id: 'text_1', type: 'text' },
		{ id: 'date_1', type: 'date' },
		{ id: 'formula_1', type: 'formula' },
		{ id: 'subtasks_1', type: 'subtasks' },
	];
	const targetColumns = [
		{ id: 'name', type: 'name' },
		{ id: 'status_target', type: 'status' },
		{ id: 'text_9', type: 'text' },
	];

	it('keeps the picked pairs and fills every other mappable column with target: null', () => {
		const mapping = completeMoveColumnsMapping(
			[{ source: 'text_1', target: 'text_9' }],
			sourceColumns,
			targetColumns,
		);
		expect(mapping).toEqual([
			{ source: 'text_1', target: 'text_9' },
			{ source: 'status', target: null },
			{ source: 'date_1', target: null },
		]);
	});

	it('never includes name, subtasks, or formula columns in the fill', () => {
		const mapping = completeMoveColumnsMapping([], sourceColumns, targetColumns);
		expect(mapping.map((pair) => pair.source)).toEqual(['status', 'text_1', 'date_1']);
	});

	it('rejects a source column that does not exist on the board', () => {
		expect(() =>
			completeMoveColumnsMapping(
				[{ source: 'nope', target: 'text_9' }],
				sourceColumns,
				targetColumns,
			),
		).toThrow("does not exist on the item's board");
	});

	it('rejects mapping an unmappable column type', () => {
		expect(() =>
			completeMoveColumnsMapping(
				[{ source: 'name', target: 'name' }],
				sourceColumns,
				targetColumns,
			),
		).toThrow('cannot be mapped');
	});

	it('rejects a duplicate source column', () => {
		expect(() =>
			completeMoveColumnsMapping(
				[
					{ source: 'text_1', target: 'text_9' },
					{ source: 'text_1', target: 'text_9' },
				],
				sourceColumns,
				targetColumns,
			),
		).toThrow('mapped more than once');
	});

	it('rejects a target column that does not exist on the target board', () => {
		expect(() =>
			completeMoveColumnsMapping(
				[{ source: 'text_1', target: 'nope' }],
				sourceColumns,
				targetColumns,
			),
		).toThrow('does not exist on the target board');
	});
});

describe('moveItem', () => {
	const boardMoveParams = {
		boardId: '123',
		itemId: '11',
		moveDestination: 'board',
		targetBoardId: '999',
		targetBoardGroupId: 'topics',
	};

	// The boards lookup moveItem runs before completing a configured mapping.
	const boardsResponse = {
		boards: [
			{
				id: '123',
				columns: [
					{ id: 'name', type: 'name' },
					{ id: 'status', type: 'status' },
					{ id: 'text_1', type: 'text' },
					{ id: 'date_1', type: 'date' },
				],
			},
			{
				id: '999',
				columns: [
					{ id: 'status_target', type: 'status' },
					{ id: 'text_9', type: 'text' },
				],
			},
		],
	};

	it('moves to a group on the same board via move_item_to_group', async () => {
		const { client, execute } = makeClient([{ move_item_to_group: { id: '11' } }]);
		const result = await moveItem.call(
			makeParamsContext({ itemId: '11', moveDestination: 'group', targetGroupId: 'done' }),
			client,
			0,
		);
		expect(execute.mock.calls[0][0]).toContain('move_item_to_group');
		expect(execute.mock.calls[0][2]).toEqual({ itemId: '11', groupId: 'done' });
		expect(result).toEqual({ id: '11' });
	});

	it('cross-board: completes the guided mapper rows into a full columns_mapping', async () => {
		const { client, execute } = makeClient([boardsResponse, { move_item_to_board: { id: '11' } }]);
		await moveItem.call(
			makeParamsContext({
				...boardMoveParams,
				columnsMappingUi: {
					mappings: [
						{ source: 'status', target: 'status_target' },
						{ source: 'text_1', target: 'text_9' },
					],
				},
			}),
			client,
			0,
		);
		expect(execute.mock.calls[0][0]).toContain('boards(ids: $ids)');
		expect(execute.mock.calls[0][2]).toEqual({ ids: ['123', '999'] });
		expect(execute.mock.calls[1][0]).toContain('move_item_to_board');
		expect(execute.mock.calls[1][2]).toEqual({
			boardId: '999',
			groupId: 'topics',
			itemId: '11',
			columnsMapping: [
				{ source: 'status', target: 'status_target' },
				{ source: 'text_1', target: 'text_9' },
				{ source: 'date_1', target: null },
			],
		});
	});

	it('cross-board: mapper rows take precedence over the JSON escape hatch', async () => {
		const { client, execute } = makeClient([boardsResponse, { move_item_to_board: { id: '11' } }]);
		await moveItem.call(
			makeParamsContext({
				...boardMoveParams,
				columnsMappingUi: { mappings: [{ source: 'status', target: 'status_target' }] },
				moveOptions: { columnsMapping: '[{"source": "text_1", "target": "text_9"}]' },
			}),
			client,
			0,
		);
		expect(execute.mock.calls[1][2].columnsMapping).toEqual([
			{ source: 'status', target: 'status_target' },
			{ source: 'text_1', target: null },
			{ source: 'date_1', target: null },
		]);
	});

	it('cross-board: surfaces a friendly error for an unknown mapped column', async () => {
		const { client } = makeClient([boardsResponse]);
		await expect(
			moveItem.call(
				makeParamsContext({
					...boardMoveParams,
					columnsMappingUi: { mappings: [{ source: 'nope', target: 'text_9' }] },
				}),
				client,
				0,
			),
		).rejects.toThrow("does not exist on the item's board");
	});

	it('cross-board: rejects a mapper row missing the target column', async () => {
		const { client } = makeClient([{}]);
		await expect(
			moveItem.call(
				makeParamsContext({
					...boardMoveParams,
					columnsMappingUi: { mappings: [{ source: 'status', target: '' }] },
				}),
				client,
				0,
			),
		).rejects.toThrow('row 1 needs both a source and a target column');
	});

	it('cross-board: completes the JSON escape hatch mapping when no rows are configured', async () => {
		const { client, execute } = makeClient([boardsResponse, { move_item_to_board: { id: '11' } }]);
		await moveItem.call(
			makeParamsContext({
				...boardMoveParams,
				columnsMappingUi: {},
				moveOptions: { columnsMapping: '[{"source": "text_1", "target": "text_9"}]' },
			}),
			client,
			0,
		);
		expect(execute.mock.calls[1][2].columnsMapping).toEqual([
			{ source: 'text_1', target: 'text_9' },
			{ source: 'status', target: null },
			{ source: 'date_1', target: null },
		]);
	});

	it('cross-board: rejects non-array JSON mapping', async () => {
		const { client } = makeClient([{}]);
		await expect(
			moveItem.call(
				makeParamsContext({
					...boardMoveParams,
					moveOptions: { columnsMapping: '{"source": "a"}' },
				}),
				client,
				0,
			),
		).rejects.toThrow('JSON array');
	});

	it('cross-board: sends null columns_mapping when nothing is configured', async () => {
		const { client, execute } = makeClient([{ move_item_to_board: { id: '11' } }]);
		await moveItem.call(makeParamsContext(boardMoveParams), client, 0);
		expect(execute.mock.calls[0][2].columnsMapping).toBeNull();
	});

	// Roadmap item 12570922790: move_item_to_board has no with_updates argument on
	// any API version (2026-10 / 2027-01 / dev, introspected 2026-07-19) — updates
	// always travel with the moved item (verified live). The UI documents that via
	// a notice instead of a toggle; the mutation must never invent the argument.
	it('cross-board: never sends a with_updates argument (API does not have one)', async () => {
		const { client, execute } = makeClient([{ move_item_to_board: { id: '11' } }]);
		await moveItem.call(makeParamsContext(boardMoveParams), client, 0);
		expect(execute.mock.calls[0][0]).not.toContain('with_updates');
		expect(Object.keys(execute.mock.calls[0][2] as IDataObject)).toEqual([
			'boardId',
			'groupId',
			'itemId',
			'columnsMapping',
		]);
	});

	it('documents that updates always move with the item via a UI notice, not a toggle', () => {
		const properties = new MondayComV2(baseDescription).description.properties;
		const notice = properties.find((p) => p.name === 'moveToBoardUpdatesNotice');
		expect(notice?.type).toBe('notice');
		expect(notice?.displayOptions?.show?.moveDestination).toEqual(['board']);
		expect(String(notice?.displayName)).toContain('updates');

		// The only withUpdates toggle belongs to Item: Duplicate — none on Move.
		const withUpdatesParams = properties.filter((p) => p.name === 'withUpdates');
		expect(withUpdatesParams).toHaveLength(1);
		expect(withUpdatesParams[0].displayOptions?.show?.operation).toEqual(['duplicateItem']);
	});
});

describe('item input mode for item-only operations', () => {
	const properties = new MondayComV2(baseDescription).description.properties;
	// createNotification joins this list when the notification resource is
	// ported (the community node has 5 item-only operations).
	const itemOnlyOps = ['createUpdate', 'getItem', 'getItemSubscribers', 'getUpdates'];

	it('shows an Item Input selector for every item-only operation', () => {
		const selectors = properties.filter((p) => p.name === 'itemInputMode');
		const coveredOps = selectors.flatMap(
			(p) => (p.displayOptions?.show?.operation ?? []) as string[],
		);
		expect(coveredOps.sort()).toEqual([...itemOnlyOps].sort());
		for (const selector of selectors) {
			expect(selector.options?.map((o) => 'value' in o && o.value)).toEqual(['id', 'list']);
		}
	});

	it('never shows a board picker unless it powers the list mode or is the target itself', () => {
		const boardBlocks = properties.filter((p) => p.name === 'boardId');
		for (const block of boardBlocks) {
			const show = block.displayOptions?.show ?? {};
			const ops = (show.operation ?? []) as string[];
			if (!ops.some((op) => itemOnlyOps.includes(op))) continue;
			const gatedToListMode = show.itemInputMode?.[0] === 'list';
			const isNotificationBoardTarget = show.notificationTarget?.[0] === 'board';
			expect(gatedToListMode || isNotificationBoardTarget).toBe(true);
		}
	});

	// The item list picker calls searchItems, which needs boardId — shown
	// too early it just opens to "Parameter Board is required".
	it('hides the item list picker until a board is selected', () => {
		const node = { typeVersion: 2 };
		const description = new MondayComV2(baseDescription).description;
		const itemListBlocks = properties.filter(
			(p) => p.name === 'itemId' && p.displayOptions?.show?.itemInputMode?.[0] === 'list',
		);
		// Item slice + updates each contribute a block; notifications add the
		// third in a later PR (the community node has 3).
		expect(itemListBlocks.length).toBe(2);

		for (const block of itemListBlocks) {
			const operation = (block.displayOptions!.show!.operation as string[])[0];
			const base: IDataObject = {
				operation,
				itemInputMode: 'list',
				updatesScope: 'item',
				notificationTarget: 'item',
			};
			const displayed = (boardId: IDataObject) =>
				NodeHelpers.displayParameter({ ...base, boardId }, block, node, description);

			expect(displayed({ __rl: true, mode: 'list', value: '' })).toBe(false);
			expect(displayed({ __rl: true, mode: 'list', value: '123' })).toBe(true);
			// An expression can't be resolved statically, so keep it visible.
			expect(displayed({ __rl: true, mode: 'id', value: '={{ $json.boardId }}' })).toBe(true);
		}
	});

	it('keeps the dual-mode item locator visible without a board (By ID needs none)', () => {
		const description = new MondayComV2(baseDescription).description;
		const dualModeBlock = properties.find(
			(p) =>
				p.name === 'itemId' &&
				p.type === 'resourceLocator' &&
				p.modes?.length === 2 &&
				((p.displayOptions?.show?.operation ?? []) as string[]).includes('updateItem'),
		);
		expect(dualModeBlock).toBeDefined();
		expect(
			NodeHelpers.displayParameter(
				{ operation: 'updateItem', boardId: { __rl: true, mode: 'list', value: '' } },
				dualModeBlock!,
				{ typeVersion: 2 },
				description,
			),
		).toBe(true);
	});

	it('pairs each input mode with the matching item field', () => {
		const itemBlocks = properties.filter(
			(p) =>
				p.name === 'itemId' &&
				((p.displayOptions?.show?.operation ?? []) as string[]).some((op) =>
					itemOnlyOps.includes(op),
				),
		);
		expect(itemBlocks.length).toBeGreaterThan(0);
		for (const block of itemBlocks) {
			const inputMode = block.displayOptions?.show?.itemInputMode?.[0];
			if (inputMode === 'list') {
				expect(block.type).toBe('resourceLocator');
				expect(block.modes?.map((m) => m.name)).toEqual(['list']);
			} else {
				expect(inputMode).toBe('id');
				// A plain text field, not a single-mode picker.
				expect(block.type).toBe('string');
				expect(block.modes).toBeUndefined();
			}
		}
	});
});
