import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { itemInputModeProperty } from '../../helpers/itemLocator';
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
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['getItemSubscribers'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
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
		itemIndex,
		{ ids: [itemId] },
	);
	const item = ((data.items ?? []) as Array<IDataObject & { subscribers?: IDataObject[] }>)[0];
	if (!item) {
		throw new NodeOperationError(this.getNode(), `Item ${itemId} not found`, {
			itemIndex,
		});
	}
	return (item.subscribers ?? []).map((subscriber) => ({
		...subscriber,
		itemId: item.id,
		itemName: item.name,
	}));
}
