import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { taskRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [taskRLC];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;

	const qs: IDataObject = {};

	const body = {
		query: [
			{
				_name: 'getTask',
				idOrName: taskId,
			},
		],
	};

	qs.name = `get-task-${taskId}`;

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
