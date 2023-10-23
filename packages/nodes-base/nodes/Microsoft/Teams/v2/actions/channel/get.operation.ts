import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { channelRLC, teamRLC } from '../../descriptions';

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

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;

	return microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels/${channelId}`);
}
