import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { channelRLC, teamRLC } from '../../descriptions';

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

	await microsoftApiRequest.call(this, 'DELETE', `/v1.0/teams/${teamId}/channels/${channelId}`);
	return { success: true };
}
