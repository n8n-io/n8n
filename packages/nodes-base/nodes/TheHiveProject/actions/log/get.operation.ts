import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { logRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [logRLC];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const logId = this.getNodeParameter('logId', i, '', { extractValue: true }) as string;

	const body = {
		query: [
			{
				_name: 'getLog',
				idOrName: logId,
			},
		],
	};

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
