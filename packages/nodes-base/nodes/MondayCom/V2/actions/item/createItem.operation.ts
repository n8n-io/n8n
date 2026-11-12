import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { extractMappedValues, resolveSubitemBoardId } from '../../helpers/columnMapper';
import { resolveColumnValues } from '../../helpers/itemColumnValues';
import { itemResourceLocator } from '../../helpers/itemLocator';
import {
	BATTERY_VALUE_FRAGMENT,
	COLUMN_VALUES_CALCULATED_ARG,
	LINKED_VALUE_FRAGMENTS,
} from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import {
	columnsProperty,
	columnValuesJsonProperty,
	columnValuesModeProperty,
	createOptionsProperty,
} from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		// Top-level item vs subitem for the unified Create operation.
		displayName: 'Create As',
		name: 'createAs',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Subitem',
				value: 'subitem',
				description:
					'Create the item under a parent item — on multi-level boards the parent can itself be a subitem',
			},
			{
				name: 'Top-Level Item',
				value: 'item',
				description: 'Create the item in a group on the board',
			},
		],
		default: 'item',
		description: 'Whether to create a top-level item or a subitem under a parent item',
	},
	{
		...itemResourceLocator,
		displayName: 'Parent Item',
		description:
			"The item to create the subitem under. On classic boards subitems get the subitem board's own columns; on multi-level boards all levels share the parent board's columns and the parent can be a subitem itself (up to 5 levels).",
		displayOptions: { show: { createAs: ['subitem'] } },
	},
	{
		displayName:
			"On multi-level boards, creating the first subitem turns the parent's rollup columns (numbers, date, timeline, status with rollup enabled) into calculated values — the parent's existing values in those columns move down to the new subitem so the rollup still shows them, and writing to those columns on the parent silently has no effect from then on. Other column types are unaffected",
		name: 'createSubitemMultiLevelNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { createAs: ['subitem'] } },
	},
	{
		displayName: 'Item Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new item',
	},
	columnValuesModeProperty,
	columnsProperty,
	columnValuesJsonProperty,
	createOptionsProperty,
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['createItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/** Item: Create — create_item with column values from the shared builder. */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	// Unified Create: Subitem mode routes to create_subitem.
	const createAs = this.getNodeParameter('createAs', itemIndex, 'item') as string;
	if (createAs === 'subitem') {
		return await createSubitem.call(this, client, itemIndex);
	}

	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const name = this.getNodeParameter('name', itemIndex) as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;
	const groupId = (createOptions.groupId as string) || '';
	const columnValues = await resolveColumnValues.call(this, itemIndex, boardId);

	const data = await client.execute(
		`mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON, $createLabels: Boolean) {
			create_item(
				board_id: $boardId,
				group_id: $groupId,
				item_name: $itemName,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			boardId,
			groupId: groupId || null,
			itemName: name,
			// The API's JSON scalar arrives as a string.
			columnValues: columnValues ? JSON.stringify(columnValues) : null,
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.create_item ?? {}) as IDataObject;
}

/**
 * Item: Create in Subitem mode — create_subitem under a parent item,
 * through the same column builder as
 * Create. Mapper values are typed against the SUBITEM board, resolved via
 * the parent board's subtasks column — on multi-level boards that resolves
 * to the parent board itself (one shared schema at every depth), and the
 * parent may be a subitem (nesting up to 5 levels).
 */
export async function createSubitem(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const parentBoardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const parentItemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const name = this.getNodeParameter('name', itemIndex) as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;

	// Column types must come from the subitem board, not the parent's.
	// Only needed in mapper mode; raw JSON passes through untyped.
	const mode = this.getNodeParameter('columnValuesMode', itemIndex) as string;
	let valuesBoardId = parentBoardId;
	if (mode === 'mapper') {
		const mapped = extractMappedValues(this.getNodeParameter('columns', itemIndex, {}));
		if (Object.keys(mapped).length > 0) {
			const subitemBoardId = await resolveSubitemBoardId(this, parentBoardId, itemIndex);
			if (!subitemBoardId) {
				throw new NodeOperationError(
					this.getNode(),
					'This board has no subitems board yet — create the first subitem without column values, or use Raw JSON',
					{ itemIndex },
				);
			}
			valuesBoardId = subitemBoardId;
		}
	}
	const columnValues = await resolveColumnValues.call(this, itemIndex, valuesBoardId);

	const data = await client.execute(
		`mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON, $createLabels: Boolean) {
			create_subitem(
				parent_item_id: $parentItemId,
				item_name: $itemName,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				parent_item { id name }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			parentItemId,
			itemName: name,
			columnValues: columnValues ? JSON.stringify(columnValues) : null,
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.create_subitem ?? {}) as IDataObject;
}
