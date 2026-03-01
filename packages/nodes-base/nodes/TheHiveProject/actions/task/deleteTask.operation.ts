import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { taskRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [taskRLC];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['deleteTask'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/task/${taskId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
