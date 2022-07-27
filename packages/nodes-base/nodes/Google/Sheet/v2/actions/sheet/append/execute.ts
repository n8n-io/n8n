import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getSpreadsheetId,
	GoogleSheet,
	ValueInputOption,
} from '../../../helper';

export async function append(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

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

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
	const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

	const items = this.getInputData();

	const setData: IDataObject[] = [];

	setData.push(items[index].json);

	const usePathForKeyRow = (options.usePathForKeyRow || false) as boolean;

	// Convert data into array format
	const data = await sheet.appendSheetData(setData, sheet.encodeRange(range), keyRow, valueInputMode, usePathForKeyRow);
	return this.helpers.returnJsonArray(data.updates);
}
