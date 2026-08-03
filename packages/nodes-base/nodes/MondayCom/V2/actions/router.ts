import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import {
	archiveOrDeleteManyItems,
	bulkImportItems,
	clearColumnValues,
	createItem,
	createSubitem,
	getBulkImportJobStatus,
	getColumnValue,
	getItem,
	getManyItems,
	moveItem,
	resolveArchiveOrDeleteAction,
	searchAcrossAccount,
	updateItem,
} from './item/item.execute';
import { SEARCH_OPERATION_ENTITY } from '../helpers/accountSearch';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	// API version is pinned node-wide (constants.ts), not per credential.
	const client = new MondayGraphQLClient(this);

	const operation = this.getNodeParameter('operation', 0) as string;

	// Bulk Import consumes ALL input items into ONE import job (in mapped
	// mode each input item is one CSV row) — run once per execution.
	if (operation === 'bulkImport') {
		try {
			const rows = await bulkImportItems.call(this, client, items.length);
			returnData.push(...rows);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: 0 },
				});
			} else {
				// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
				throw error;
			}
		}
		return [returnData];
	}

	for (let i = 0; i < items.length; i++) {
		try {
			if (operation === 'createItem') {
				const data = await createItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'createSubitem') {
				const data = await createSubitem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'updateItem') {
				const data = await updateItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'clearColumnValues') {
				const rows = await clearColumnValues.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getItem') {
				const data = await getItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getColumnValue') {
				const data = await getColumnValue.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getBulkImportStatus') {
				const rows = await getBulkImportJobStatus.call(this, client, i);
				returnData.push(...rows);
				continue;
			}

			if (operation === 'moveItem') {
				const data = await moveItem.call(this, client, i);
				returnData.push({ json: data, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'duplicateItem') {
				const boardId = this.getNodeParameter('boardId', i, undefined, {
					extractValue: true,
				}) as string;
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const withUpdates = this.getNodeParameter('withUpdates', i, false) as boolean;
				const data = await client.execute(
					`mutation ($boardId: ID!, $itemId: ID!, $withUpdates: Boolean) {
						duplicate_item(board_id: $boardId, item_id: $itemId, with_updates: $withUpdates) {
							id
							name
							url
							state
							board { id name }
							group { id title }
						}
					}`,
					i,
					{ boardId, itemId, withUpdates },
				);
				returnData.push({
					json: (data.duplicate_item ?? {}) as IDataObject,
					pairedItem: { item: i },
				});
				continue;
			}

			// 'archiveItem'/'deleteItem' are the legacy operation values from
			// before the ops were unified — old workflow JSON still runs.
			if (
				operation === 'archiveOrDeleteItem' ||
				operation === 'archiveItem' ||
				operation === 'deleteItem'
			) {
				const action = resolveArchiveOrDeleteAction.call(this, operation, i);
				const itemsMode = this.getNodeParameter('itemsMode', i, 'single') as string;
				if (operation === 'archiveOrDeleteItem' && itemsMode === 'multiple') {
					const rows = await archiveOrDeleteManyItems.call(this, client, i, action);
					for (const row of rows) {
						returnData.push({ json: row, pairedItem: { item: i } });
					}
					continue;
				}
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const mutation =
					action === 'archive'
						? 'mutation ($itemId: ID!) { archive_item(item_id: $itemId) { id name state } }'
						: 'mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id name state } }';
				const data = await client.execute(mutation, i, { itemId });
				const payload = (data.archive_item ?? data.delete_item ?? {}) as IDataObject;
				returnData.push({ json: { ...payload, action }, pairedItem: { item: i } });
				continue;
			}

			if (operation === 'getItemSubscribers') {
				const itemId = this.getNodeParameter('itemId', i, undefined, {
					extractValue: true,
				}) as string;
				const data = await client.execute(
					`query ($ids: [ID!]) {
						items(ids: $ids) {
							id
							name
							subscribers { id name email }
						}
					}`,
					i,
					{ ids: [itemId] },
				);
				const item = (
					(data.items ?? []) as Array<IDataObject & { subscribers?: IDataObject[] }>
				)[0];
				if (!item) {
					throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, {
						itemIndex: i,
					});
				}
				for (const subscriber of item.subscribers ?? []) {
					returnData.push({
						json: { ...subscriber, itemId: item.id, itemName: item.name },
						pairedItem: { item: i },
					});
				}
				continue;
			}

			if (SEARCH_OPERATION_ENTITY[operation] !== undefined) {
				const rows = await searchAcrossAccount.call(this, client, i, operation);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			if (operation === 'getItems') {
				const rows = await getManyItems.call(this, client, i);
				for (const row of rows) {
					returnData.push({ json: row, pairedItem: { item: i } });
				}
				continue;
			}

			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported`,
				{ itemIndex: i },
			);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: i },
				});
				continue;
			}
			// Errors from MondayGraphQLClient are already mapped NodeApiErrors.
			throw error;
		}
	}

	return [returnData];
}
