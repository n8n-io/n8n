import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { groupSourceOptions } from '../../descriptions';
import { returnAllOrLimit } from '@utils/descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	groupSourceOptions,
	{
		displayName: 'Tasks For',
		name: 'tasksFor',
		default: 'member',
		required: true,
		type: 'options',
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
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: ['groupSource'],
		},
		default: '',
	},
	{
		displayName: 'Member Name or ID',
		name: 'memberId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getMembers',
			loadOptionsDependsOn: ['groupId'],
		},
		displayOptions: {
			show: {
				tasksFor: ['member'],
			},
		},
		default: '',
	},
	{
		displayName: 'Plan Name or ID',
		name: 'planId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getPlans',
			loadOptionsDependsOn: ['groupId'],
		},
		displayOptions: {
			show: {
				tasksFor: ['plan'],
			},
		},
		default: '',
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
		const memberId = this.getNodeParameter('memberId', i) as string;
		if (returnAll) {
			await microsoftApiRequestAllItems.call(
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
		const planId = this.getNodeParameter('planId', i) as string;
		if (returnAll) {
			await microsoftApiRequestAllItems.call(
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
