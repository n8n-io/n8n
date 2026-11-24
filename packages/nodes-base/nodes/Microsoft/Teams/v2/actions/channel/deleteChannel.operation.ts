import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest } from '../../transport';

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

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	// Build (and validate) the path outside the try so an invalid-ID error surfaces
	// with its specific message instead of the generic "channel doesn't exist" below.
	const endpoint = buildTeamsPath.call(this, [
		'/v1.0/teams/',
		{ id: teamId },
		'/channels/',
		{ id: channelId },
	]);

	try {
		await microsoftApiRequest.call(this, 'DELETE', endpoint);
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
