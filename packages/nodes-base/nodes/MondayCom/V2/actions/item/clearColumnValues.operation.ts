import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { normalizeIdList } from '../../helpers/filterOptions';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Item IDs',
		name: 'clearItemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1234567890, 1234567891',
		description:
			'Comma-separated IDs of the items to clear (up to 10 per execution). Feed it from a Get Many operation with an expression.',
	},
	{
		displayName: 'Columns to Clear',
		name: 'clearColumnIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getClearableBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: [],
		required: true,
		description:
			'The columns to reset to their empty/default value on every selected item (up to 10). Read-only columns (formula, mirror, etc.) cannot be cleared. In expression mode, pass a comma-separated string of column IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName:
			'Clearing is permanent and not atomic: if some items in the batch fail, the others are still cleared. The output reports success or failure per item; without "Continue On Fail" a partial failure stops the run with an error naming the failed IDs. Re-running the batch is safe — clearing is idempotent.',
		name: 'clearColumnValuesNotice',
		type: 'notice',
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['clearColumnValues'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/** Product cap for Item: Clear Column Values — items and columns per execution. */
export const MAX_CLEAR_ITEMS = 10;

export const MAX_CLEAR_COLUMNS = 10;

/**
 * Builds the single aliased request that clears the given columns on every
 * item: one change_multiple_column_values per item, all in one mutation.
 * Setting a column to null resets it to its empty/default value (verified
 * live for text, numbers, date, link, status, checkbox and file columns).
 * Exported for unit tests.
 */
export function buildClearColumnValuesMutation(
	itemIds: string[],
	columnIds: string[],
): { query: string; variables: Record<string, unknown> } {
	const columnValues = JSON.stringify(
		Object.fromEntries(columnIds.map((columnId) => [columnId, null])),
	);
	const variables: Record<string, unknown> = { boardId: undefined, columnValues };
	const varDefs = ['$boardId: ID!', '$columnValues: JSON!'];
	const aliases: string[] = [];

	itemIds.forEach((itemId, index) => {
		varDefs.push(`$item${index}: ID!`);
		variables[`item${index}`] = itemId;
		aliases.push(
			`item${index}: change_multiple_column_values(board_id: $boardId, item_id: $item${index}, column_values: $columnValues) { id name }`,
		);
	});

	return {
		query: `mutation (${varDefs.join(', ')}) {\n\t${aliases.join('\n\t')}\n}`,
		variables,
	};
}

/**
 * Item: Clear Column Values — resets up to 10 columns on up to 10 items back
 * to their empty/default values in ONE aliased API request. Not atomic: if a
 * later item in the batch fails, earlier aliases may already have executed.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const itemIds = normalizeIdList(this.getNodeParameter('clearItemIds', itemIndex));
	const columnIds = normalizeIdList(this.getNodeParameter('clearColumnIds', itemIndex));

	if (itemIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Provide at least one item ID to clear', {
			itemIndex,
		});
	}
	if (itemIds.length > MAX_CLEAR_ITEMS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many items: ${itemIds.length} provided, but Clear Column Values handles at most ${MAX_CLEAR_ITEMS} per execution. Split the list across multiple runs.`,
			{ itemIndex },
		);
	}
	if (columnIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one column to clear', {
			itemIndex,
		});
	}
	if (columnIds.length > MAX_CLEAR_COLUMNS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many columns: ${columnIds.length} selected, but Clear Column Values handles at most ${MAX_CLEAR_COLUMNS} per execution`,
			{ itemIndex },
		);
	}

	const { query, variables } = buildClearColumnValuesMutation(itemIds, columnIds);
	variables.boardId = boardId;
	const { data, errors } = await client.executeBulk(query, itemIndex, variables);

	const failures: Array<{ itemId: string; message: string }> = [];
	const rows = itemIds.map((itemId, index) => {
		const payload = data[`item${index}`] as IDataObject | null | undefined;
		if (payload) {
			return {
				itemId: (payload.id as string) ?? itemId,
				name: payload.name ?? null,
				success: true,
				clearedColumnIds: columnIds,
			} as IDataObject;
		}
		const failure = errors.find((error) => error.path?.[0] === `item${index}`);
		const message = failure?.message ?? 'Unknown error';
		failures.push({ itemId, message });
		return {
			itemId,
			success: false,
			error: message,
			errorCode: failure?.extensions?.code ?? failure?.error_code ?? null,
		} as IDataObject;
	});

	if (failures.length > 0 && !this.continueOnFail()) {
		const detail = failures.map((failure) => `${failure.itemId} (${failure.message})`).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`${failures.length} of ${itemIds.length} items failed to clear: ${detail}. The other items in the batch were still cleared.`,
			{ itemIndex },
		);
	}

	return rows;
}
