import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { bucketRLC, groupRLC, groupSourceOptions, memberRLC, planRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
import { updateDisplayOptions } from '@utils/utilities';

const properties: INodeProperties[] = [
	groupSourceOptions,
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. h3ufgLvXPkSRzYm-zO5cY5gANtBQ',
		description: 'The ID of the task to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				...memberRLC,
				displayName: 'Assigned To',
				name: 'assignedTo',
				description: 'Who the task should be assigned to',
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.groupId.balue'],
				},
			},
			{
				...bucketRLC,
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.planId.balue'],
				},
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
				...groupRLC,
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['/groupSource'],
				},
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['updateFields.planId'],
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description: 'Labels to assign to the task',
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
				...planRLC,
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.groupId.balue'],
				},
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

	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;
	const updateFields = this.getNodeParameter('updateFields', i);

	for (const key of Object.keys(updateFields)) {
		if (updateFields.groupId) {
			// tasks are assigned to a plan and bucket, group is used for filtering
			delete updateFields.groupId;
			continue;
		}

		if (key === 'assignedTo') {
			const assignedTo = this.getNodeParameter('updateFields.assignedTo', i, '', {
				extractValue: true,
			}) as string;

			updateFields.assignments = {
				[assignedTo]: {
					'@odata.type': 'microsoft.graph.plannerAssignment',
					orderHint: ' !',
				},
			};
			delete updateFields.assignedTo;
			continue;
		}

		if (['bucketId', 'planId'].includes(key)) {
			updateFields[key] = this.getNodeParameter(`updateFields.${key}`, i, '', {
				extractValue: true,
			}) as string;
		}
	}

	const body: IDataObject = {};
	Object.assign(body, updateFields);

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
