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
	ISheetUpdateData,
	ValueInputOption,
	ValueRenderOption,
} from '../../../helper';

export async function upsert(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {

	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	// ###
	// Data Location Options
	// ###

	let range = `${sheetName}!A:ZZZ`;
	// Need to sub 1 as the API starts from 0
	const keyRow = (parseInt(options.headerRow as string, 10) - 1 || 0);
	const dataStartRow = (parseInt(options.dataStartRow as string, 10) - 1 || 1);

	// ###
	// Output Format Options
	// ###
	const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
	const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

	// ###
	// Data Mapping
	// ###
	const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMatch';
	const items = this.getInputData();
	const setData: IDataObject[] = [];
	let keyName : string = "";

	if (dataToSend === 'autoMatch') {
		items.forEach((item) => {
			setData.push(item.json);
		});
		keyName = this.getNodeParameter('fieldsUi', 0) as string;
	} else {
		const fields = this.getNodeParameter('fieldsUi.fieldValues', index, []) as IDataObject;
		let dataToSend: IDataObject = {};

		dataToSend = {...dataToSend, [fields.fieldId as string]: fields.valueToMatchOn}
		keyName = fields.fieldId as string;
		setData.push(dataToSend);
	}

	const data = await sheet.updateSheetData(setData, keyName, range, keyRow, dataStartRow, valueInputMode, valueRenderMode, true);
	return this.helpers.returnJsonArray(items);
}
