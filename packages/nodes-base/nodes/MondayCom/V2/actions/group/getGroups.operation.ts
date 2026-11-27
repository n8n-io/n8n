import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardNotFoundError, boardResourceLocator } from '../../helpers/boardLocator';
import { normalizeIdList } from '../../helpers/filterOptions';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Options',
		name: 'getGroupsOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				// "Groups" per product wording, matching Include Columns/Groups.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these groups; selecting none returns all groups of the board. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['getGroups'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const groupOptions = this.getNodeParameter('getGroupsOptions', itemIndex, {}) as IDataObject;
	const groupIds = normalizeIdList(groupOptions.groupIds);

	const data = await client.execute(
		`query ($boardId: [ID!], $groupIds: [String]) {
			boards(ids: $boardId) {
				groups(ids: $groupIds) {
					id
					title
					color
					position
					archived
				}
			}
		}`,
		itemIndex,
		{ boardId: [boardId], groupIds: groupIds.length > 0 ? groupIds : null },
	);
	const board = ((data.boards ?? []) as Array<{ groups?: IDataObject[] }>)[0];
	if (!board) throw boardNotFoundError(this.getNode(), boardId, itemIndex);
	return board.groups ?? [];
}
