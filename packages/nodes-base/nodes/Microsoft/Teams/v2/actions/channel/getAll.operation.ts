import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { teamRLC } from '../../descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [teamRLC, ...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/v1.0/teams/${teamId}/channels`,
		);
	} else {
		const limit = this.getNodeParameter('limit', i);
		const responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/v1.0/teams/${teamId}/channels`,
			{},
		);
		return responseData.splice(0, limit);
	}
}
