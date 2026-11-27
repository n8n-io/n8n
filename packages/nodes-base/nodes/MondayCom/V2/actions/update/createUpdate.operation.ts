import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { normalizeIdList } from '../../helpers/filterOptions';
import { itemInputModeProperty } from '../../helpers/itemLocator';
import { buildUserRowsProperty, extractUserRowIds } from '../../helpers/userLocator';
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
		displayName: 'Update Text',
		name: 'updateBody',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description:
			'The text of the update. Supports HTML tags: &lt;b&gt; (bold), &lt;i&gt; (italic), &lt;u&gt; (underline), &lt;a&gt; (links), &lt;br&gt; (line breaks). Some HTML attributes and styles may be stripped by the API. Maximum length limit unknown. Do not use @ symbols for mentions; use Mention Users/Teams options instead.',
	},
	{
		displayName: 'Options',
		name: 'createUpdateOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			buildUserRowsProperty({
				displayName: 'Mention Users',
				name: 'mentionUserIds',
				description:
					'Users to mention and notify in the update. In expression mode, pass user IDs as a comma-separated string.',
			}),
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Mention Teams',
				name: 'mentionTeamIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getTeamsList' },
				default: [],
				description:
					'Teams to mention and notify in the update. In expression mode, pass team IDs as a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Reply to Update ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Post this as a reply to an existing update instead of a new thread',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['update'],
		operation: ['createUpdate'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Builds create_update's mentions_list from the Mention Users / Mention
 * Teams options. Users come from a searchable rows collection (or an
 * array/CSV via expressions); teams from a bounded multiOptions dropdown.
 */
export function buildMentionsList(
	userIds: unknown,
	teamIds: unknown,
): Array<{ id: string; type: string }> {
	return [
		...extractUserRowIds(userIds).map((id) => ({ id, type: 'User' })),
		...normalizeIdList(teamIds).map((id) => ({ id, type: 'Team' })),
	];
}

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const body = this.getNodeParameter('updateBody', itemIndex) as string;
	const updateOptions = this.getNodeParameter('createUpdateOptions', itemIndex, {}) as IDataObject;
	const parentId = (updateOptions.parentId as string) || null;
	const mentions = buildMentionsList(updateOptions.mentionUserIds, updateOptions.mentionTeamIds);

	const data = await client.execute(
		`mutation ($itemId: ID!, $body: String!, $parentId: ID, $mentions: [UpdateMention!]) {
			create_update(item_id: $itemId, body: $body, parent_id: $parentId, mentions_list: $mentions) {
				id
				body
				text_body
				created_at
				item_id
				creator { id name }
			}
		}`,
		itemIndex,
		{ itemId, body, parentId, mentions: mentions.length > 0 ? mentions : null },
	);
	return (data.create_update ?? {}) as IDataObject;
}
