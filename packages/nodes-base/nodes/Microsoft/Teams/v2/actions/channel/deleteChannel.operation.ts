import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [teamRLC, channelRLC];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['deleteChannel'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-delete?view=graph-rest-beta&tabs=http

	try {
		const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
		const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;

		await microsoftApiRequest.call(this, 'DELETE', `/v1.0/teams/${teamId}/channels/${channelId}`);
		return { success: true };
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			"The channel you are trying to delete doesn't exist",
			{
				description: "Check that the 'Channel' parameter is correctly set",
			},
		);
	}
}
