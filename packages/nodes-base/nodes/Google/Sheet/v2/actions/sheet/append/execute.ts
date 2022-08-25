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

export async function append(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	// ###
	// Data Location Options
	// ###
	// Automatically work out the range
	const range = sheetName;
	// Subtract 1 as we start from 1 now.
	const keyRow = (parseInt(options.headerRow as string, 10) - 1 || 0);

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
		items.forEach((item) => {
			setData.push(item.json);
		});
	} else {
		for (let i = 0; i < items.length; i++) {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
			let dataToSend: IDataObject = {};
			for (const field of fields) {
				dataToSend = {...dataToSend, [field.fieldId]: field.fieldValue};
			}
			setData.push(dataToSend);
		}
	}

	const usePathForKeyRow = (options.usePathForKeyRow || false) as boolean;

	// Convert data into array format
	const data = await sheet.appendSheetData(setData, range, keyRow, valueInputMode, usePathForKeyRow);
	// data.updates returns some good information
	//return this.helpers.returnJsonArray(data.updates);
	return this.helpers.returnJsonArray(items);
}

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;
