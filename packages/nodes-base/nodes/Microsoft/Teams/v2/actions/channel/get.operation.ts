import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
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
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i) as string;
	const channelId = this.getNodeParameter('channelId', i) as string;
	return microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels/${channelId}`);
}
