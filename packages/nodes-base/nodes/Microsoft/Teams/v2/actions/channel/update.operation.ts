import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		default: '',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
			loadOptionsDependsOn: ['teamId'],
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Channel name as it will appear to the user in Microsoft Teams',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "Channel's description",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-patch?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i) as string;
	const channelId = this.getNodeParameter('channelId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i);
	const body: IDataObject = {};
	if (updateFields.name) {
		body.displayName = updateFields.name as string;
	}
	if (updateFields.description) {
		body.description = updateFields.description as string;
	}
	await microsoftApiRequest.call(
		this,
		'PATCH',
		`/v1.0/teams/${teamId}/channels/${channelId}`,
		body,
	);
	return { success: true };
}
