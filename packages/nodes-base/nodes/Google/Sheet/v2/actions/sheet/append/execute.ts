import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	GoogleSheet,
	ValueInputOption,
} from '../../../helper';

export async function append(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

	const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;

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

	return this.helpers.returnJsonArray(items);
}
