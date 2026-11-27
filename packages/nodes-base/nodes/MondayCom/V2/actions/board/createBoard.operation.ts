import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	buildUserRowsProperty,
	extractUserRowIds,
	splitUserTeamIds,
} from '../../helpers/userLocator';
import { extractWorkspaceId, workspaceResourceLocator } from '../../helpers/workspaceLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	{
		displayName: 'Board Name',
		name: 'boardName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new board',
	},
	{
		displayName: 'Board Kind',
		name: 'boardKind',
		type: 'options',
		options: [
			{ name: 'Private', value: 'private' },
			{ name: 'Public', value: 'public' },
			{ name: 'Shareable', value: 'share' },
		],
		default: 'public',
		required: true,
		description:
			'Who can see the board: public = everyone in the account, private = invited members, shareable = including guests',
	},
	{
		displayName: 'Options',
		name: 'createBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the new board',
			},
			{
				// The folder ID string is the value; "Name or ID" suffix per lint.
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCreateBoardWorkspaceFolders',
					loadOptionsDependsOn: ['createBoardOptions.workspaceId.value'],
				},
				default: '',
				description:
					'The folder to create the board in. Select a workspace first — the list shows that workspace’s folders. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			buildUserRowsProperty({
				displayName: 'Owners',
				name: 'ownerIds',
				includeTeams: true,
				description:
					'The users and/or teams to set as board owners. The creating user is always an owner. In expression mode, pass a comma-separated string of user IDs and/or <code>team:&lt;ID&gt;</code> values.',
			}),
			buildUserRowsProperty({
				displayName: 'Subscribers',
				name: 'subscriberIds',
				includeTeams: true,
				description:
					'The users and/or teams to subscribe to the board. In expression mode, pass a comma-separated string of user IDs and/or <code>team:&lt;ID&gt;</code> values.',
			}),
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description:
					'Create the board from this board template. monday has no API to list templates, so copy the numeric ID from the template’s Template Center URL (enable Developer mode in monday.labs to see IDs). The template must be accessible to the API user.',
			},
			{
				...workspaceResourceLocator,
				description:
					'The workspace to create the board in. To use the account’s Main workspace, leave this unset — the API does not list it as a selectable workspace. Picking a workspace here also loads its folders into the Folder option.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['createBoard'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Board: Create — create_board with optional workspace, template, owners
 * and subscribers. Only user-set arguments are sent, so API defaults
 * (main workspace, no template) stay in effect.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardName = this.getNodeParameter('boardName', itemIndex) as string;
	const boardKind = this.getNodeParameter('boardKind', itemIndex) as string;
	const options = this.getNodeParameter('createBoardOptions', itemIndex, {}) as IDataObject;

	const varDefs = ['$name: String!', '$kind: BoardKind!'];
	const args = ['board_name: $name', 'board_kind: $kind'];
	const variables: Record<string, unknown> = { name: boardName, kind: boardKind };

	if (options.description) {
		varDefs.push('$description: String');
		args.push('description: $description');
		variables.description = options.description;
	}
	// Resource locator nested in a collection: the read of the parent
	// collection hands back the raw { mode, value } object.
	const createBoardWorkspaceId = extractWorkspaceId(options.workspaceId);
	if (createBoardWorkspaceId) {
		varDefs.push('$workspaceId: ID');
		args.push('workspace_id: $workspaceId');
		variables.workspaceId = createBoardWorkspaceId;
	}
	if (options.folderId) {
		varDefs.push('$folderId: ID');
		args.push('folder_id: $folderId');
		variables.folderId = options.folderId;
	}
	if (options.templateId) {
		varDefs.push('$templateId: ID');
		args.push('template_id: $templateId');
		variables.templateId = options.templateId;
	}
	// Owners/Subscribers mix users and teams in one picker; the API wants
	// them split into separate arguments. Note the asymmetric argument name:
	// board_subscriber_teams_ids (teams_ids, not team_ids).
	const owners = splitUserTeamIds(extractUserRowIds(options.ownerIds));
	if (owners.userIds.length > 0) {
		varDefs.push('$ownerIds: [ID!]');
		args.push('board_owner_ids: $ownerIds');
		variables.ownerIds = owners.userIds;
	}
	if (owners.teamIds.length > 0) {
		varDefs.push('$ownerTeamIds: [ID!]');
		args.push('board_owner_team_ids: $ownerTeamIds');
		variables.ownerTeamIds = owners.teamIds;
	}
	const subscribers = splitUserTeamIds(extractUserRowIds(options.subscriberIds));
	if (subscribers.userIds.length > 0) {
		varDefs.push('$subscriberIds: [ID!]');
		args.push('board_subscriber_ids: $subscriberIds');
		variables.subscriberIds = subscribers.userIds;
	}
	if (subscribers.teamIds.length > 0) {
		varDefs.push('$subscriberTeamIds: [ID!]');
		args.push('board_subscriber_teams_ids: $subscriberTeamIds');
		variables.subscriberTeamIds = subscribers.teamIds;
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			create_board(${args.join(', ')}) {
				id
				name
				board_kind
				description
				url
				board_folder_id
				folder { id name }
				workspace { id name }
			}
		}`,
		itemIndex,
		variables,
	);

	return (data.create_board ?? {}) as IDataObject;
}
