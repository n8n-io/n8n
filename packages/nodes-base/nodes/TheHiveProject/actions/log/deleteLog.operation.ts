import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { logRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [logRLC];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['deleteLog'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const logId = this.getNodeParameter('logId', i, '', { extractValue: true }) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/log/${logId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
