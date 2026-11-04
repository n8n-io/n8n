import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	resolveArchiveOrDeleteAction,
	withArchiveOrDeleteOutcome,
} from '../../helpers/archiveOrDelete';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { normalizeIdList } from '../../helpers/filterOptions';
import { itemResourceLocator } from '../../helpers/itemLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { archiveOrDeleteActionProperty } from '../common.description';

const properties: INodeProperties[] = [
	{
		// Single (picked item) vs bulk (ID list) input for the unified
		// Archive or Delete operation. Item IDs are globally unique, so
		// bulk mode needs no board picker.
		displayName: 'Items to Process',
		name: 'itemsMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Multiple Items',
				value: 'multiple',
				description: 'Provide a list of item IDs — processed in one batched request',
			},
			{
				name: 'Single Item',
				value: 'single',
				description: 'Pick one item on a board',
			},
		],
		default: 'single',
		description: 'Whether to process one picked item or a list of item IDs',
	},
	{
		// Dedicated board/item pickers for Archive or Delete: hidden in
		// bulk mode. A hide rule (not show: { itemsMode: ['single'] }) keeps
		// the pickers visible when itemsMode has no stored value yet.
		...boardResourceLocator,
		displayOptions: {
			hide: { itemsMode: ['multiple'] },
		},
	},
	{
		...itemResourceLocator,
		displayOptions: {
			hide: { itemsMode: ['multiple'] },
		},
	},
	{
		displayName: 'Item IDs',
		name: 'bulkItemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1234567890, 1234567891',
		description:
			'Comma-separated IDs of the items to archive or delete (up to 50 per execution). Feed it from a Get Many operation with an expression.',
		displayOptions: { show: { itemsMode: ['multiple'] } },
	},
	{
		displayName:
			'The batch is not atomic: if one item ID fails, the other items in the list are still archived or deleted',
		name: 'bulkArchiveOrDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { itemsMode: ['multiple'] } },
	},
	archiveOrDeleteActionProperty,
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['archiveOrDeleteItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/** Product cap for bulk Item: Archive or Delete — item IDs per execution. */
export const MAX_BULK_ARCHIVE_DELETE_ITEMS = 50;

/**
 * Builds the single aliased request that archives or deletes every item in
 * the list: one archive_item/delete_item per ID, all in one mutation. The
 * batch is NOT atomic — a failing alias returns null (with a per-alias error
 * carrying its path) while the other aliases still execute (verified live).
 * Exported for unit tests.
 */
export function buildBulkArchiveOrDeleteMutation(
	action: 'archive' | 'delete',
	itemIds: string[],
): { query: string; variables: Record<string, unknown> } {
	const mutationField = action === 'archive' ? 'archive_item' : 'delete_item';
	const variables: Record<string, unknown> = {};
	const varDefs: string[] = [];
	const aliases: string[] = [];

	itemIds.forEach((itemId, index) => {
		varDefs.push(`$item${index}: ID!`);
		variables[`item${index}`] = itemId;
		aliases.push(`item${index}: ${mutationField}(item_id: $item${index}) { id name state }`);
	});

	return {
		query: `mutation (${varDefs.join(', ')}) {\n\t${aliases.join('\n\t')}\n}`,
		variables,
	};
}

/**
 * Item: Archive or Delete in Multiple Items mode — up to 50 item IDs in ONE
 * aliased API request. Per-ID failures are mapped back to their item via the
 * error path; with continueOnFail they become error rows, otherwise the run
 * fails with a summary that names the failed IDs (the rest were still
 * processed — the batch is not atomic).
 */
export async function archiveOrDeleteManyItems(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	action: 'archive' | 'delete',
): Promise<IDataObject[]> {
	const itemIds = [...new Set(normalizeIdList(this.getNodeParameter('bulkItemIds', itemIndex)))];

	if (itemIds.length === 0) {
		throw new NodeOperationError(this.getNode(), `Provide at least one item ID to ${action}`, {
			itemIndex,
		});
	}
	if (itemIds.length > MAX_BULK_ARCHIVE_DELETE_ITEMS) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many items: ${itemIds.length} provided, but Archive or Delete handles at most ${MAX_BULK_ARCHIVE_DELETE_ITEMS} unique item IDs per execution. Split the list across multiple runs.`,
			{ itemIndex },
		);
	}

	const { query, variables } = buildBulkArchiveOrDeleteMutation(action, itemIds);
	const { data, errors } = await client.executeBulk(query, itemIndex, variables);

	const failures: Array<{ itemId: string; message: string }> = [];
	const rows = itemIds.map((itemId, index) => {
		const payload = data[`item${index}`] as IDataObject | null | undefined;
		if (payload) {
			return withArchiveOrDeleteOutcome(payload, action, 'item');
		}
		const failure = errors.find((error) => error.path?.[0] === `item${index}`);
		const message = failure?.message ?? 'Unknown error';
		failures.push({ itemId, message });
		return {
			itemId,
			action,
			error: message,
			errorCode: failure?.extensions?.code ?? failure?.error_code ?? null,
		} as IDataObject;
	});

	if (failures.length > 0 && !this.continueOnFail()) {
		const detail = failures.map((failure) => `${failure.itemId} (${failure.message})`).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`${failures.length} of ${itemIds.length} items failed to ${action}: ${detail}. The other items in the batch were still processed.`,
			{ itemIndex },
		);
	}

	return rows;
}

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const action = resolveArchiveOrDeleteAction.call(this, itemIndex);
	const itemsMode = this.getNodeParameter('itemsMode', itemIndex, 'single') as string;
	if (itemsMode === 'multiple') {
		return await archiveOrDeleteManyItems.call(this, client, itemIndex, action);
	}
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const mutation =
		action === 'archive'
			? 'mutation ($itemId: ID!) { archive_item(item_id: $itemId) { id name state } }'
			: 'mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id name state } }';
	const data = await client.execute(mutation, itemIndex, { itemId });
	const payload = (data.archive_item ?? data.delete_item ?? {}) as IDataObject;
	return withArchiveOrDeleteOutcome(payload, action, 'item');
}
