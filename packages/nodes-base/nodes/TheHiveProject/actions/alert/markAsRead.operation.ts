import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
import { alertRLC } from '../common.description';

const properties: INodeProperties[] = [alertRLC];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['markAsRead'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;

	responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/markAsRead`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
