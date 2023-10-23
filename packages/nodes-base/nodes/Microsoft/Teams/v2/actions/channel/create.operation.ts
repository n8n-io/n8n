import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { teamRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	teamRLC,
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		default: '',
		description: 'Channel name as it will appear to the user in Microsoft Teams',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "Channel's description",
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
				description: 'The type of the channel',
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
	return microsoftApiRequest.call(this, 'POST', `/v1.0/teams/${teamId}/channels`, body);
}
