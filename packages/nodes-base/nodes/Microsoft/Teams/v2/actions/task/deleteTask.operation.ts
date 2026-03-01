import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		placeholder: 'e.g. h3ufgLvXPkSRzYm-zO5cY5gANtBQ',
		description: 'The ID of the task to delete',
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['deleteTask'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/plannertask-delete?view=graph-rest-1.0&tabs=http

	const taskId = this.getNodeParameter('taskId', i) as string;
	const task = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/tasks/${taskId}`);
	await microsoftApiRequest.call(
		this,
		'DELETE',
		`/v1.0/planner/tasks/${taskId}`,
		{},
		{},
		undefined,
		{ 'If-Match': task['@odata.etag'] },
	);
	return { success: true };
}
