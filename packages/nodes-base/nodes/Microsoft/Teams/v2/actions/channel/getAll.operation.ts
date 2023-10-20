import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { returnAllOrLimit } from '@utils/descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		default: '',
	},
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/teams/${teamId}/channels`);
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
