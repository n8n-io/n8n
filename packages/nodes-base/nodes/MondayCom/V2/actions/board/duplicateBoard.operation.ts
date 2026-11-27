import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { extractWorkspaceId, workspaceResourceLocator } from '../../helpers/workspaceLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Duplicate Type',
		name: 'duplicateType',
		type: 'options',
		options: [
			{
				name: 'Structure and Items',
				value: 'duplicate_board_with_pulses',
				description: 'Copy groups, columns, and all items',
			},
			{
				name: 'Structure Only',
				value: 'duplicate_board_with_structure',
				description: 'Copy groups and columns, without items',
			},
			{
				name: 'Structure, Items and Updates',
				value: 'duplicate_board_with_pulses_and_updates',
				description: 'Copy groups, columns, items, and their updates',
			},
		],
		default: 'duplicate_board_with_structure',
		required: true,
		description: 'How much of the board to copy',
	},
	{
		displayName: 'Options',
		name: 'duplicateBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Board Name',
				name: 'boardName',
				type: 'string',
				default: '',
				description: 'The name of the new board; left unset, monday derives one from the original',
			},
			{
				// The folder ID string is the value; "Name or ID" suffix per lint.
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaceFolders',
					loadOptionsDependsOn: ['duplicateBoardOptions.workspaceId.value'],
				},
				default: '',
				description:
					'The folder to create the duplicate in. Select a workspace first — the list shows that workspace’s folders. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Keep Subscribers',
				name: 'keepSubscribers',
				type: 'boolean',
				default: false,
				description: 'Whether to copy the original board’s subscribers to the new board',
			},
			{
				...workspaceResourceLocator,
				description:
					'The workspace to create the duplicate in; left unset, it stays in the original board’s workspace. Picking a workspace here also loads its folders into the Folder option.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['duplicateBoard'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Board: Duplicate — duplicate_board. The API wraps the result in a
 * BoardDuplication object ({ board, is_async }); large boards may be
 * duplicated asynchronously, in which case is_async is true and the board
 * may still be filling up when the response returns.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const duplicateType = this.getNodeParameter('duplicateType', itemIndex) as string;
	const options = this.getNodeParameter('duplicateBoardOptions', itemIndex, {}) as IDataObject;

	const varDefs = ['$boardId: ID!', '$duplicateType: DuplicateBoardType!'];
	const args = ['board_id: $boardId', 'duplicate_type: $duplicateType'];
	const variables: Record<string, unknown> = { boardId, duplicateType };

	if (options.boardName) {
		varDefs.push('$boardName: String');
		args.push('board_name: $boardName');
		variables.boardName = options.boardName;
	}
	// Resource locator nested in a collection — see extractWorkspaceId.
	const duplicateWorkspaceId = extractWorkspaceId(options.workspaceId);
	if (duplicateWorkspaceId) {
		varDefs.push('$workspaceId: ID');
		args.push('workspace_id: $workspaceId');
		variables.workspaceId = duplicateWorkspaceId;
	}
	if (options.folderId) {
		varDefs.push('$folderId: ID');
		args.push('folder_id: $folderId');
		variables.folderId = options.folderId;
	}
	if (options.keepSubscribers === true) {
		args.push('keep_subscribers: true');
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			duplicate_board(${args.join(', ')}) {
				is_async
				board {
					id
					name
					state
					board_kind
					url
					workspace { id name }
				}
			}
		}`,
		itemIndex,
		variables,
	);

	const duplication = (data.duplicate_board ?? {}) as IDataObject & { board?: IDataObject };
	return { ...(duplication.board ?? {}), isAsync: duplication.is_async ?? false };
}
