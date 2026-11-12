import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
	UserError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { itemResourceLocator } from '../../helpers/itemLocator';
import { safeJsonParse } from '../../helpers/json';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	itemResourceLocator,
	{
		displayName: 'Move To',
		name: 'moveDestination',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Another Board',
				value: 'board',
				description: 'Move the item to a group on a different board, with optional column mapping',
			},
			{
				name: 'Group on the Same Board',
				value: 'group',
				description: 'Move the item to another group of its board',
			},
		],
		default: 'group',
	},
	{
		displayName: 'Target Group Name or ID',
		name: 'targetGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The group to move the item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { moveDestination: ['group'] } },
	},
	{
		...boardResourceLocator,
		displayName: 'Target Board',
		name: 'targetBoardId',
		description: 'The board to move the item to',
		displayOptions: { show: { moveDestination: ['board'] } },
	},
	{
		displayName: 'Target Board Group Name or ID',
		name: 'targetBoardGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTargetBoardGroups',
			loadOptionsDependsOn: ['targetBoardId.value'],
		},
		default: '',
		required: true,
		description:
			'The group on the target board to move the item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { moveDestination: ['board'] } },
	},
	{
		// No include-updates toggle here on purpose (roadmap item 12570922790):
		// move_item_to_board has no with_updates argument on any API version
		// (2026-10 / 2027-01 / dev, introspected 2026-07-19) because updates
		// belong to the item and always move with it — verified live.
		displayName:
			"The item's updates (and their attachments) always move with the item — no toggle needed. Only column values can be lost: map them below.",
		name: 'moveToBoardUpdatesNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { moveDestination: ['board'] } },
	},
	{
		displayName: 'Columns Mapping',
		name: 'columnsMappingUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Column Mapping',
		default: {},
		description:
			'How source columns map to target-board columns. Unmapped columns lose their values on cross-board moves.',
		displayOptions: { show: { moveDestination: ['board'] } },
		options: [
			{
				displayName: 'Mapping',
				name: 'mappings',
				values: [
					{
						displayName: 'Source Column Name or ID',
						name: 'source',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column on the item\'s current board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Target Column Name or ID',
						name: 'target',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTargetBoardColumns',
							loadOptionsDependsOn: ['targetBoardId.value'],
						},
						default: '',
						description:
							'The column on the target board that receives the value. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'moveOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { moveDestination: ['board'] } },
		options: [
			{
				displayName: 'Columns Mapping (JSON)',
				name: 'columnsMapping',
				type: 'json',
				default: '[]',
				description:
					'How source columns map to target-board columns, as [{"source": "columnId", "target": "columnId"}] — an expression-friendly alternative to the Columns Mapping rows above. Ignored when any mapping rows are configured.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['moveItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Column types move_item_to_board's columns_mapping cannot include — the
 * API rejects the whole mapping with an opaque "Columns mapping is not in
 * the expected format" error (name and subtasks verified live 2026-07-19;
 * formula per the API docs). These columns are handled by the move itself.
 */
export const MOVE_UNMAPPABLE_COLUMN_TYPES = new Set(['formula', 'name', 'subtasks']);

/**
 * Builds the complete columns_mapping that move_item_to_board requires. The
 * API rejects partial mappings outright, so the configured pairs are
 * validated against both boards' columns and every remaining mappable
 * source column is filled in with target: null — which is what monday's own
 * move dialog submits for unmapped columns (their values are dropped).
 * Exported for unit tests.
 */
export function completeMoveColumnsMapping(
	picked: Array<{ source: string; target?: string | null }>,
	sourceColumns: Array<{ id: string; type: string }>,
	targetColumns: Array<{ id: string; type: string }>,
): Array<{ source: string; target: string | null }> {
	const sourceById = new Map(sourceColumns.map((column) => [column.id, column]));
	const targetIds = new Set(targetColumns.map((column) => column.id));

	const mapping: Array<{ source: string; target: string | null }> = [];
	const mappedSourceIds = new Set<string>();
	for (const pair of picked) {
		const sourceColumn = sourceById.get(pair.source);
		if (!sourceColumn) {
			throw new UserError(`Column "${pair.source}" does not exist on the item's board`);
		}
		if (MOVE_UNMAPPABLE_COLUMN_TYPES.has(sourceColumn.type)) {
			throw new UserError(
				`The "${pair.source}" column (type ${sourceColumn.type}) cannot be mapped — the move handles it automatically`,
			);
		}
		if (mappedSourceIds.has(pair.source)) {
			throw new UserError(`Column "${pair.source}" is mapped more than once`);
		}
		const target = pair.target ?? null;
		if (target !== null && target !== '' && !targetIds.has(target)) {
			throw new UserError(`Column "${target}" does not exist on the target board`);
		}
		mappedSourceIds.add(pair.source);
		mapping.push({ source: pair.source, target: target === '' ? null : target });
	}

	for (const column of sourceColumns) {
		if (!mappedSourceIds.has(column.id) && !MOVE_UNMAPPABLE_COLUMN_TYPES.has(column.type)) {
			mapping.push({ source: column.id, target: null });
		}
	}
	return mapping;
}

/**
 * Item: Move — move_item_to_group within the board, or move_item_to_board
 * with an optional columns_mapping for cross-board moves. The mapping comes
 * from the guided mapper rows when any are configured, otherwise from the
 * raw-JSON escape hatch in Options; either way it is completed to the
 * full-board mapping the API demands. Exported for unit tests.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const destination = this.getNodeParameter('moveDestination', itemIndex) as string;

	if (destination === 'group') {
		const targetGroupId = this.getNodeParameter('targetGroupId', itemIndex) as string;
		const data = await client.execute(
			`mutation ($itemId: ID!, $groupId: String!) {
				move_item_to_group(item_id: $itemId, group_id: $groupId) {
					id
					name
					url
					board { id name }
					group { id title }
				}
			}`,
			itemIndex,
			{ itemId, groupId: targetGroupId },
		);
		return (data.move_item_to_group ?? {}) as IDataObject;
	}

	const targetBoardId = this.getNodeParameter('targetBoardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const targetGroupId = this.getNodeParameter('targetBoardGroupId', itemIndex) as string;
	const moveOptions = this.getNodeParameter('moveOptions', itemIndex, {}) as IDataObject;
	const mappingUi = this.getNodeParameter('columnsMappingUi', itemIndex, {}) as {
		mappings?: Array<{ source?: string; target?: string }>;
	};

	let pickedMapping: Array<{ source: string; target: string | null }> | undefined;
	const uiRows = mappingUi.mappings ?? [];
	if (uiRows.length > 0) {
		pickedMapping = uiRows.map((row, rowIndex) => {
			const source = typeof row.source === 'string' ? row.source.trim() : '';
			const target = typeof row.target === 'string' ? row.target.trim() : '';
			if (!source || !target) {
				throw new NodeOperationError(
					this.getNode(),
					`Columns Mapping row ${rowIndex + 1} needs both a source and a target column`,
					{ itemIndex },
				);
			}
			return { source, target };
		});
	} else {
		const rawMapping = moveOptions.columnsMapping;
		if (rawMapping !== undefined && rawMapping !== null && rawMapping !== '') {
			const parsed = typeof rawMapping === 'string' ? safeJsonParse(rawMapping) : rawMapping;
			if (!Array.isArray(parsed)) {
				throw new NodeOperationError(
					this.getNode(),
					'Columns Mapping must be a JSON array of {"source", "target"} pairs',
					{ itemIndex },
				);
			}
			if (parsed.length > 0) {
				pickedMapping = parsed as Array<{ source: string; target: string | null }>;
			}
		}
	}

	// The API rejects partial mappings ("Columns mapping is not in the
	// expected format"), so complete the configured pairs against both
	// boards' real columns before sending.
	let columnsMapping: Array<{ source: string; target: string | null }> | undefined;
	if (pickedMapping) {
		const sourceBoardId = this.getNodeParameter('boardId', itemIndex, undefined, {
			extractValue: true,
		}) as string;
		const boardData = await client.execute(
			'query ($ids: [ID!]) { boards(ids: $ids) { id columns { id type } } }',
			itemIndex,
			{ ids: [sourceBoardId, targetBoardId] },
		);
		const boards = (boardData.boards ?? []) as Array<{
			id: string;
			columns?: Array<{ id: string; type: string }>;
		}>;
		const sourceColumns = boards.find((board) => board.id === String(sourceBoardId))?.columns ?? [];
		const targetColumns = boards.find((board) => board.id === String(targetBoardId))?.columns ?? [];
		try {
			columnsMapping = completeMoveColumnsMapping(pickedMapping, sourceColumns, targetColumns);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex });
		}
	}

	const data = await client.execute(
		`mutation ($boardId: ID!, $groupId: ID!, $itemId: ID!, $columnsMapping: [ColumnMappingInput!]) {
			move_item_to_board(
				board_id: $boardId,
				group_id: $groupId,
				item_id: $itemId,
				columns_mapping: $columnsMapping
			) {
				id
				name
				url
				board { id name }
				group { id title }
			}
		}`,
		itemIndex,
		{
			boardId: targetBoardId,
			groupId: targetGroupId,
			itemId,
			columnsMapping: columnsMapping ?? null,
		},
	);
	return (data.move_item_to_board ?? {}) as IDataObject;
}
