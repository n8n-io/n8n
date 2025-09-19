import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [teamRLC, channelRLC];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-beta&tabs=http

	try {
		const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
		const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;

		return await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/teams/${teamId}/channels/${channelId}`,
		);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			"The channel you are trying to get doesn't exist",
			{
				description: "Check that the 'Channel' parameter is correctly set",
			},
		);
	}
}
