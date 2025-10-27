import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { alertRLC, caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [alertRLC, caseRLC];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['merge'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true }) as string;

	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	responseData = await theHiveApiRequest.call(
		this,
		'POST',
		`/alert/${alertId}/merge/${caseId}`,
		{},
	);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
