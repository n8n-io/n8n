import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getSpreadsheetId,
	GoogleSheet,
} from '../../../helper';

export async function clear(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const resourceType = this.getNodeParameter('resourceLocator', 0, {}) as string;
	let resourceValue: string = '';
	if (resourceType === 'byId') {
		resourceValue = this.getNodeParameter('spreadsheetId', 0, {}) as string;
	} else if (resourceType === 'byUrl') {
		resourceValue = this.getNodeParameter('spreadsheetUrl', 0, {}) as string;
	} else if (resourceType === 'fromList') {
		resourceValue = this.getNodeParameter('spreadsheetName', 0, {}) as string;
	}
	const spreadsheetId = getSpreadsheetId(resourceType, resourceValue);

	const sheet = new GoogleSheet(spreadsheetId, this);
	const range = this.getNodeParameter('range', 0) as string;
	await sheet.clearData(sheet.encodeRange(range));

	const items = this.getInputData();
	return this.helpers.returnJsonArray(items[index]);
}
