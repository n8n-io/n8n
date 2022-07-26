import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import {
	GoogleSheet,
} from '../../../helper';

export async function clear(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;

	const sheet = new GoogleSheet(spreadsheetId, this);
	const range = this.getNodeParameter('range', 0) as string;
	await sheet.clearData(sheet.encodeRange(range));

	const items = this.getInputData();
	return this.helpers.returnJsonArray(items[index]);
}
