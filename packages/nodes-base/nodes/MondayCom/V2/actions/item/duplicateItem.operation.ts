import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { itemResourceLocator } from '../../helpers/itemLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	itemResourceLocator,
	{
		displayName: 'Include Updates',
		name: 'withUpdates',
		type: 'boolean',
		default: false,
		description: 'Whether the duplicate should include the item’s updates',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['duplicateItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const withUpdates = this.getNodeParameter('withUpdates', itemIndex, false) as boolean;
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
		itemIndex,
		{ boardId, itemId, withUpdates },
	);
	return (data.duplicate_item ?? {}) as IDataObject;
}
