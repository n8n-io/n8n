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
	// ###
	// "Global" Options
	// ###
	// TODO: Replace when Resource Locator component is available
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
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	// ###
	// Data Location Options
	// ###
	// Automatically work out the range
	const range = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	const keyRow = (parseInt(options.headerRow as string, 10) || 0);

	// ###
	// Output Format Options
	// ###
	const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;

	// ###
	// Data Mapping
	// ###
	const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData' | 'nothing';
	const items = this.getInputData();
	const setData: IDataObject[] = [];

	if (dataToSend === 'autoMapInputData') {
		setData.push(items[index].json);
	} else {
		const fields = this.getNodeParameter('fieldsUi.fieldValues', index, []) as FieldsUiValues;
		let dataToSend: IDataObject = {};
		for (let field of fields) {
			dataToSend = {...dataToSend, [field.fieldId]: field.fieldValue};
		}
		setData.push(dataToSend);
	}

	const usePathForKeyRow = (options.usePathForKeyRow || false) as boolean;

	// Convert data into array format
	const data = await sheet.appendSheetData(setData, range, keyRow, valueInputMode, usePathForKeyRow);
	// data.updates returns some good information
	//return this.helpers.returnJsonArray(data.updates);
	return this.helpers.returnJsonArray(items[index].json);
}

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;
