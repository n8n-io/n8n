import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	HIDE_UNTIL_BOARD_SELECTED,
	itemIdTextProperty,
	itemInputModeProperty,
	itemListOnlyResourceLocator,
} from '../../helpers/itemLocator';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	{
		...itemInputModeProperty,
		displayOptions: { show: { updatesScope: ['item'] } },
	},
	{
		...boardResourceLocator,
		description: 'The board holding the item — used only to pick the item from the list',
		displayOptions: {
			show: { updatesScope: ['item'], itemInputMode: ['list'] },
		},
	},
	{
		...itemListOnlyResourceLocator,
		displayOptions: {
			show: { updatesScope: ['item'], itemInputMode: ['list'] },
			hide: HIDE_UNTIL_BOARD_SELECTED,
		},
	},
	{
		...itemIdTextProperty,
		displayOptions: {
			show: { updatesScope: ['item'], itemInputMode: ['id'] },
		},
	},
	{
		displayName: 'Scope',
		name: 'updatesScope',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Account',
				value: 'account',
				description: 'The most recent updates across the whole account',
			},
			{
				name: 'Item',
				value: 'item',
				description: 'Updates posted on one item',
			},
		],
		default: 'item',
	},
	{
		displayName: 'Options',
		name: 'getUpdatesOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Include Assets',
				name: 'includeAssets',
				type: 'boolean',
				default: false,
				description: 'Whether to include files attached to each update',
			},
			{
				displayName: 'Include Replies',
				name: 'includeReplies',
				type: 'boolean',
				default: false,
				description: 'Whether to include the replies of each update',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'Higher limits consume more of your account’s API complexity budget per run',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description:
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through long histories.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['update'],
		operation: ['getUpdates'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Update: Get Many — updates(limit, page) account-wide, or the updates
 * connection of one item. Replies and assets are opt-in (they add
 * complexity cost per update).
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const scope = this.getNodeParameter('updatesScope', itemIndex) as string;
	const options = this.getNodeParameter('getUpdatesOptions', itemIndex, {}) as IDataObject;
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const page = (options.page as number) ?? 1;

	const extraFields = [
		options.includeReplies === true
			? 'replies { id body text_body created_at creator { id name } }'
			: '',
		options.includeAssets === true ? 'assets { id name url file_extension }' : '',
	].join('\n');
	const updateFields = `
		id
		body
		text_body
		created_at
		updated_at
		item_id
		creator { id name }
		${extraFields}
	`;

	if (scope === 'account') {
		const data = await client.execute(
			`query ($limit: Int!, $page: Int!) {
				updates(limit: $limit, page: $page) { ${updateFields} }
			}`,
			itemIndex,
			{ limit, page },
		);
		return (data.updates ?? []) as IDataObject[];
	}

	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const data = await client.execute(
		`query ($ids: [ID!], $limit: Int!, $page: Int!) {
			items(ids: $ids) {
				updates(limit: $limit, page: $page) { ${updateFields} }
			}
		}`,
		itemIndex,
		{ ids: [itemId], limit, page },
	);
	return ((data.items ?? []) as Array<{ updates?: IDataObject[] }>)[0]?.updates ?? [];
}
