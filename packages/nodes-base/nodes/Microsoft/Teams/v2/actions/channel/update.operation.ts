import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	teamRLC,
	channelRLC,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My New Channel name',
		description: 'The name of the channel',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the channel',
				typeOptions: {
					rows: 2,
				},
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

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const newName = this.getNodeParameter('name', i) as string;
	const newDescription = this.getNodeParameter('options.description', i, '') as string;

	const body: IDataObject = {};
	if (newName) {
		body.displayName = newName;
	}
	if (newDescription) {
		body.description = newDescription;
	}
	await microsoftApiRequest.call(
		this,
		'PATCH',
		`/v1.0/teams/${teamId}/channels/${channelId}`,
		body,
	);
	return { success: true };
}
