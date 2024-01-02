import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { theHiveApiRequest } from '../../transport';
import { alertRLC } from '../../descriptions';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [alertRLC];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['deleteAlert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/alert/${alertId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
