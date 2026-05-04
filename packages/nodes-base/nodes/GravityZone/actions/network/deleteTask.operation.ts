import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-577743-deletetask.html" target="_blank" rel="noopener noreferrer">Delete Task</a>',
		name: 'deleteTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the task to delete. The task must not be in progress.',
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['deleteTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const taskId = this.getNodeParameter('taskId', i) as string;

	const params: IDataObject = { taskId };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'deleteTask', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
