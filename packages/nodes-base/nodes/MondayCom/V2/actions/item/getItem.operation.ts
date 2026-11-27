import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { normalizeIdList } from '../../helpers/filterOptions';
import { itemInputModeProperty } from '../../helpers/itemLocator';
import {
	BATTERY_VALUE_FRAGMENT,
	type BatteryEntry,
	COLUMN_VALUES_CALCULATED_ARG,
	formatBatteryText,
	LINKED_VALUE_FRAGMENTS,
} from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import {
	itemInputBoardProperty,
	itemInputIdProperty,
	itemInputListProperty,
} from '../common.description';

const properties: INodeProperties[] = [
	// Item-only operations: the mutation/query needs just the
	// globally unique item ID, so the board picker is shown only
	// when the user wants to pick the item from a list.
	itemInputModeProperty,
	itemInputBoardProperty,
	itemInputListProperty,
	itemInputIdProperty,
	{
		// The name stays `simplify` (n8n's standard toggle param); only the label
		// is more specific, since it flattens column values, not the whole record.
		displayName: 'Simplify Column Values Response',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a flattened item (column values keyed by column title) instead of the raw API shape',
	},
	{
		displayName: 'Options',
		name: 'getItemOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Include All Item Info',
				name: 'includeAllItemInfo',
				type: 'boolean',
				default: false,
				description:
					'Whether to also return the item’s creator, email address (for creating updates by email), relative link, and subscribers',
			},
			{
				displayName: 'Include Subitems',
				name: 'includeSubitems',
				type: 'boolean',
				default: false,
				description: 'Whether to include the item’s subitems (ID, name, state)',
			},
			{
				displayName: 'Include Updates',
				name: 'includeUpdates',
				type: 'boolean',
				default: false,
				description: 'Whether to include the item’s updates (body, creator, created time)',
			},
			{
				// "Select Columns" per product wording; the standard "Names or IDs" suffix reads worse here.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Select Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these columns; selecting none returns all columns. Limiting the columns reduces the query’s complexity cost and payload size — especially on big boards. In expression mode, pass a comma-separated string of column IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['getItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

interface RawItemColumnValue extends IDataObject {
	text?: string | null;
	column?: { title?: string; settings_str?: string } | null;
	battery_value?: BatteryEntry[] | null;
	display_value?: string | null;
}

/**
 * Flattens column values into { [column title]: text }. Status rollups
 * (BatteryValue, multi-level boards) have no text — their label counts are
 * rendered as "Done: 2, Stuck: 1" via the column's status labels.
 * Linked-item columns (dependency / board_relation / mirror) also have no
 * text — they fall back to display_value, the comma-separated linked item
 * names ("" = no links, flattened to null). Exported for unit tests.
 */
export function flattenItemColumns(columnValues: RawItemColumnValue[]): IDataObject {
	const columns: IDataObject = {};
	for (const columnValue of columnValues) {
		const title = columnValue.column?.title ?? (columnValue.id as string);
		if (columnValue.battery_value) {
			columns[title] = formatBatteryText(
				columnValue.battery_value,
				columnValue.column?.settings_str,
			);
			continue;
		}
		columns[title] = columnValue.text ?? (columnValue.display_value || null);
	}
	return columns;
}

/**
 * Builds the Item: Get query. Column values are scoped to the Select
 * Columns option when set (empty = all columns — the ids argument is only
 * sent when columns were picked, which cuts complexity cost and payload on
 * big boards). Include All Item Info adds the metadata fields the base
 * selection deliberately excludes. Exported for unit tests.
 */
export function buildGetItemQuery(
	itemId: string,
	options: IDataObject,
): { query: string; variables: Record<string, unknown> } {
	const columnIds = normalizeIdList(options.columnIds);
	const scoped = columnIds.length > 0;

	const extraFields = [
		options.includeAllItemInfo === true
			? 'creator { id name email } email relative_link subscribers { id name }'
			: '',
		options.includeSubitems === true
			? 'subitems { id name state url parent_item { id name } }'
			: '',
		options.includeUpdates === true ? 'updates { id body created_at creator { id name } }' : '',
	].join('\n');

	const columnArgs = scoped
		? `ids: $columnIds, ${COLUMN_VALUES_CALCULATED_ARG}`
		: COLUMN_VALUES_CALCULATED_ARG;

	return {
		query: `query ($ids: [ID!]${scoped ? ', $columnIds: [String!]' : ''}) {
			items(ids: $ids) {
				id
				name
				state
				url
				created_at
				updated_at
				board { id name }
				group { id title }
				parent_item { id name }
				column_values(${columnArgs}) {
					id type text value column { title settings_str }
					${BATTERY_VALUE_FRAGMENT}
					${LINKED_VALUE_FRAGMENTS}
				}
				${extraFields}
			}
		}`,
		variables: scoped ? { ids: [itemId], columnIds } : { ids: [itemId] },
	};
}

/**
 * Item: Get — items(ids:) with optional subitems/updates/full metadata, and
 * a Simplify Column Values Response mode that flattens column values into
 * { [column title]: text }. Works at any depth of a multi-level board
 * (subitems are items on the same board); rollup column values are included
 * via the CALCULATED capability.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;
	const options = this.getNodeParameter('getItemOptions', itemIndex, {}) as IDataObject;

	const { query, variables } = buildGetItemQuery(itemId, options);
	const data = await client.execute(query, itemIndex, variables);

	const item = ((data.items ?? []) as IDataObject[])[0];
	if (!item) {
		throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, { itemIndex });
	}
	if (!simplify) return item;

	const columns = flattenItemColumns((item.column_values ?? []) as RawItemColumnValue[]);
	const rest = { ...item };
	delete rest.column_values;
	return { ...rest, columns };
}
