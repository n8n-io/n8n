import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { groupSourceOptions } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	groupSourceOptions,
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
		displayName: 'Plan Name or ID',
		name: 'planId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPlans',
			loadOptionsDependsOn: ['groupId'],
		},
		default: '',
		description:
			'The plan for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Bucket Name or ID',
		name: 'bucketId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBuckets',
			loadOptionsDependsOn: ['planId'],
		},
		default: '',
		description:
			'The bucket for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		default: '',
		description: 'Title of the task',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Assigned To Name or ID',
				name: 'assignedTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMembers',
					loadOptionsDependsOn: ['groupId'],
				},
				default: '',
				description:
					'Who the task should be assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description:
					'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['planId'],
				},
				default: [],
				description:
					'Labels to assign to the task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Percent Complete',
				name: 'percentComplete',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				description:
					'Percentage of task completion. When set to 100, the task is considered completed.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/planner-post-tasks?view=graph-rest-1.0&tabs=http

	const planId = this.getNodeParameter('planId', i) as string;
	const bucketId = this.getNodeParameter('bucketId', i) as string;
	const title = this.getNodeParameter('title', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i);
	const body: IDataObject = {
		planId,
		bucketId,
		title,
	};
	Object.assign(body, additionalFields);

	if (body.assignedTo) {
		body.assignments = {
			[body.assignedTo as string]: {
				'@odata.type': 'microsoft.graph.plannerAssignment',
				orderHint: ' !',
			},
		};
		delete body.assignedTo;
	}

	if (Array.isArray(body.labels)) {
		body.appliedCategories = (body.labels as string[]).map((label) => ({
			[label]: true,
		}));
	}

	return microsoftApiRequest.call(this, 'POST', '/v1.0/planner/tasks', body);
}
