import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { returnAllOrLimit } from '@utils/descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

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
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i) as string;
	const channelId = this.getNodeParameter('channelId', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/beta/teams/${teamId}/channels/${channelId}/messages`,
		);
	} else {
		const limit = this.getNodeParameter('limit', i);
		const responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/beta/teams/${teamId}/channels/${channelId}/messages`,
			{},
		);
		return responseData.splice(0, limit);
	}
}
