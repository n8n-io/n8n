import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Column Name or ID',
		name: 'deleteColumnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column to permanently delete — its values on all items are lost. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['deleteColumn'],
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
	const columnId = this.getNodeParameter('deleteColumnId', itemIndex) as string;
	// API quirk (verified live 2026-07-19): delete_column returns
	// null on success (unknown IDs still error) — echo the inputs
	// so the output row is useful downstream.
	await client.execute(
		`mutation ($boardId: ID!, $columnId: String!) {
			delete_column(board_id: $boardId, column_id: $columnId) { id }
		}`,
		itemIndex,
		{ boardId, columnId },
	);
	return { id: columnId, boardId, deleted: true };
}
