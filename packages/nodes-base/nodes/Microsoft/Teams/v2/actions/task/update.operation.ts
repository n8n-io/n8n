import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { groupSourceOptions } from '../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	groupSourceOptions,
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		default: '',
		description: 'The ID of the Task',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				displayName: 'Bucket Name or ID',
				name: 'bucketId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBuckets',
					loadOptionsDependsOn: ['updateFields.planId'],
				},
				default: '',
				description:
					'The bucket for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Group Name or ID',
				name: 'groupId',
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
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['updateFields.planId'],
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
			{
				displayName: 'Plan Name or ID',
				name: 'planId',
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
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/plannertask-update?view=graph-rest-1.0&tabs=http

	const taskId = this.getNodeParameter('taskId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i);
	const body: IDataObject = {};
	Object.assign(body, updateFields);

	if (body.assignedTo) {
		body.assignments = {
			[body.assignedTo as string]: {
				'@odata.type': 'microsoft.graph.plannerAssignment',
				orderHint: ' !',
			},
		};
		delete body.assignedTo;
	}

	if (body.groupId) {
		// tasks are assigned to a plan and bucket, group is used for filtering
		delete body.groupId;
	}

	if (Array.isArray(body.labels)) {
		body.appliedCategories = (body.labels as string[]).map((label) => ({
			[label]: true,
		}));
	}

	const task = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/tasks/${taskId}`);

	await microsoftApiRequest.call(
		this,
		'PATCH',
		`/v1.0/planner/tasks/${taskId}`,
		body,
		{},
		undefined,
		{ 'If-Match': task['@odata.etag'] },
	);

	return { success: true };
}
