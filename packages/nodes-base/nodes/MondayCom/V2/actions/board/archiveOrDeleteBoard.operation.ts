import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	resolveArchiveOrDeleteAction,
	withArchiveOrDeleteOutcome,
} from '../../helpers/archiveOrDelete';
import { boardResourceLocator } from '../../helpers/boardLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { archiveOrDeleteActionProperty } from '../common.description';

const properties: INodeProperties[] = [boardResourceLocator, archiveOrDeleteActionProperty];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['archiveOrDeleteBoard'],
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
	const mutation =
		action === 'archive'
			? 'mutation ($boardId: ID!) { archive_board(board_id: $boardId) { id name state } }'
			: 'mutation ($boardId: ID!) { delete_board(board_id: $boardId) { id name state } }';
	const data = await client.execute(mutation, itemIndex, { boardId });
	const payload = (data.archive_board ?? data.delete_board ?? {}) as IDataObject;
	return withArchiveOrDeleteOutcome(payload, action, 'board');
}
