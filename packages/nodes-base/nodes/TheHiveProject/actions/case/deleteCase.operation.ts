import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [caseRLC];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['deleteCase'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	await theHiveApiRequest.call(this, 'DELETE', `/v1/case/${caseId}`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
