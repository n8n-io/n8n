import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { groupRLC, planRLC } from '../../descriptions';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Tasks For',
		name: 'tasksFor',
		default: 'member',
		required: true,
		type: 'options',
		description: 'Whether to retrieve the tasks for a user or for a plan',
		options: [
			{
				name: 'Group Member',
				value: 'member',
				description: 'Tasks assigned to group member',
			},
			{
				name: 'Plan',
				value: 'plan',
				description: 'Tasks in group plan',
			},
		],
	},
	groupRLC,
	{
		...planRLC,
		displayOptions: {
			show: {
				tasksFor: ['plan'],
			},
		},
	},
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	const tasksFor = this.getNodeParameter('tasksFor', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i);

	if (tasksFor === 'member') {
		//https://docs.microsoft.com/en-us/graph/api/planneruser-list-tasks?view=graph-rest-1.0&tabs=http
		const memberId = ((await microsoftApiRequest.call(this, 'GET', '/v1.0/me')) as { id: string })
			.id;
		if (returnAll) {
			return await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/users/${memberId}/planner/tasks`,
			);
		} else {
			const limit = this.getNodeParameter('limit', i);
			const responseData = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/users/${memberId}/planner/tasks`,
				{},
			);
			return responseData.splice(0, limit);
		}
	} else {
		//https://docs.microsoft.com/en-us/graph/api/plannerplan-list-tasks?view=graph-rest-1.0&tabs=http
		const planId = this.getNodeParameter('planId', i, '', { extractValue: true }) as string;
		if (returnAll) {
			return await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/planner/plans/${planId}/tasks`,
			);
		} else {
			const limit = this.getNodeParameter('limit', i);
			const responseData = await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/planner/plans/${planId}/tasks`,
				{},
			);
			return responseData.splice(0, limit);
		}
	}
}
