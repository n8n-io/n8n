import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { itemResourceLocator } from '../../helpers/itemLocator';
import { safeJsonParse } from '../../helpers/json';
import {
	BATTERY_VALUE_FRAGMENT,
	type BatteryEntry,
	COLUMN_VALUES_CALCULATED_ARG,
	formatBatteryText,
	LINKED_VALUE_DETAIL_FRAGMENTS,
} from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	itemResourceLocator,
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column to read the value from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['getColumnValue'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

interface ColumnValueRow extends IDataObject {
	id: string;
	type?: string;
	text?: string | null;
	value?: string | null;
	column?: { title?: string; settings_str?: string } | null;
	battery_value?: BatteryEntry[] | null;
	is_leaf?: boolean;
	display_value?: string | null;
	linked_item_ids?: string[] | null;
	linked_items?: Array<{ id: string; name: string }> | null;
	dependency_links?: Array<{
		linked_item_id: string;
		dependency_type?: number | null;
		lag?: number | null;
	}> | null;
}

/**
 * Shapes the Get Column Value output: parsed text plus the raw API value.
 * `value` arrives as a JSON-encoded string — decode it so workflows can
 * address fields directly (e.g. {{$json.value.index}}); `valueRaw` keeps
 * the original string for round-tripping into raw-JSON updates. Status
 * rollups (BatteryValue, multi-level boards) have no text/value — they get
 * label-count text plus batteryValue/isLeaf fields instead. Linked-item
 * columns (dependency / board_relation / mirror) also have no text/value —
 * text falls back to display_value (the linked items' names), and the raw
 * link data lands in displayValue/linkedItemIds/linkedItems (+
 * dependencyLinks for dependency columns).
 */
export function formatColumnValueOutput(
	item: { id?: string; name?: string },
	columnValue: ColumnValueRow | undefined,
	columnId: string,
): IDataObject {
	let value: unknown = null;
	if (columnValue?.value != null) {
		value = safeJsonParse(columnValue.value);
		if (value === undefined) value = columnValue.value;
	}
	const output: IDataObject = {
		itemId: item.id ?? null,
		itemName: item.name ?? null,
		columnId,
		columnTitle: columnValue?.column?.title ?? null,
		columnType: columnValue?.type ?? null,
		text: columnValue?.text ?? null,
		value: value as IDataObject,
		valueRaw: columnValue?.value ?? null,
	};
	if (columnValue?.battery_value) {
		output.text = formatBatteryText(columnValue.battery_value, columnValue.column?.settings_str);
		output.batteryValue = columnValue.battery_value as unknown as IDataObject[];
		// is_leaf: false = calculated from children; true = static leaf value.
		output.isLeaf = columnValue.is_leaf ?? null;
	}
	if (columnValue?.display_value !== undefined) {
		output.text = columnValue.text ?? (columnValue.display_value || null);
		output.displayValue = columnValue.display_value ?? '';
		if (columnValue.linked_item_ids) {
			output.linkedItemIds = columnValue.linked_item_ids;
		}
		if (columnValue.linked_items) {
			output.linkedItems = columnValue.linked_items as unknown as IDataObject[];
		}
		if (columnValue.dependency_links) {
			output.dependencyLinks = columnValue.dependency_links as unknown as IDataObject[];
		}
	}
	return output;
}

/**
 * Item: Get Column Value — items(ids:) { column_values(ids:) }, one column.
 * A column with no value set still yields a record (text/value null), so
 * downstream nodes can branch on emptiness without erroring.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const columnId = this.getNodeParameter('columnId', itemIndex) as string;

	const data = await client.execute(
		`query ($ids: [ID!], $columnIds: [String!]) {
			items(ids: $ids) {
				id
				name
				column_values(ids: $columnIds, ${COLUMN_VALUES_CALCULATED_ARG}) {
					id type text value column { title settings_str }
					${BATTERY_VALUE_FRAGMENT}
					${LINKED_VALUE_DETAIL_FRAGMENTS}
				}
			}
		}`,
		itemIndex,
		{ ids: [itemId], columnIds: [columnId] },
	);

	const item = ((data.items ?? []) as Array<IDataObject & { column_values?: ColumnValueRow[] }>)[0];
	if (!item) {
		throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, { itemIndex });
	}
	const columnValue = (item.column_values ?? []).find((row) => row.id === columnId);
	if (!columnValue) {
		throw new NodeOperationError(
			this.getNode(),
			`Column ${columnId} not found on the item's board`,
			{ itemIndex },
		);
	}
	return formatColumnValueOutput(item as { id?: string; name?: string }, columnValue, columnId);
}
