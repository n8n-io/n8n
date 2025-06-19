import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { teamRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	teamRLC,
	{
		displayName: 'New Channel Name',
		name: 'name',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. My New Channel',
		description: 'The name of the new channel you want to create',
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
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
				],
				default: 'standard',
				description:
					'Standard: Accessible to everyone on the team. Private: Accessible only to a specific group of people within the team.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-post?view=graph-rest-beta&tabs=http
	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const name = this.getNodeParameter('name', i) as string;
	const options = this.getNodeParameter('options', i);

	const body: IDataObject = {
		displayName: name,
	};
	if (options.description) {
		body.description = options.description as string;
	}
	if (options.type) {
		body.membershipType = options.type as string;
	}
	return await microsoftApiRequest.call(this, 'POST', `/v1.0/teams/${teamId}/channels`, body);
}
