import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	resolveArchiveOrDeleteAction,
	withArchiveOrDeleteOutcome,
} from '../../helpers/archiveOrDelete';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { groupResourceLocator } from '../../helpers/groupLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { archiveOrDeleteActionProperty } from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	groupResourceLocator,
	archiveOrDeleteActionProperty,
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['archiveOrDeleteGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const action = resolveArchiveOrDeleteAction.call(this, itemIndex);
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const groupId = this.getNodeParameter('groupId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const mutation =
		action === 'archive'
			? `mutation ($boardId: ID!, $groupId: String!) {
					archive_group(board_id: $boardId, group_id: $groupId) { id title archived }
				}`
			: `mutation ($boardId: ID!, $groupId: String!) {
					delete_group(board_id: $boardId, group_id: $groupId) { id title deleted }
				}`;
	const data = await client.execute(mutation, itemIndex, { boardId, groupId });
	const payload = (data.archive_group ?? data.delete_group ?? {}) as IDataObject;
	return withArchiveOrDeleteOutcome(payload, action, 'group');
}
