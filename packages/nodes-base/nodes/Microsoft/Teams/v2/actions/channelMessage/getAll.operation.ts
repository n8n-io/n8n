import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [teamRLC, channelRLC, ...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return await microsoftApiRequestAllItems.call(
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
