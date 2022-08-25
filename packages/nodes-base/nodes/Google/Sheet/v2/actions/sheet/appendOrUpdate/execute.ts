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
	ValueRenderOption,
} from '../../../helper';

export async function appendOrUpdate(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {

	const items = this.getInputData();
	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		// ###
		// Data Location Options
		// ###

		const range = `${sheetName}!A:ZZZ`;
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
		const dataToSend = this.getNodeParameter('dataToSend', i) as 'defineBelow' | 'autoMatch';

		const setData: IDataObject[] = [];
		let keyName = "";

		if (dataToSend === 'autoMatch') {
			setData.push(items[i].json);
			keyName = this.getNodeParameter('fieldsUi', i) as string;
		} else {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as IDataObject;
			let dataToSend: IDataObject = {};

			dataToSend = {...dataToSend, [fields.fieldId as string]: fields.valueToMatchOn};
			keyName = fields.fieldId as string;
			setData.push(dataToSend);
		}

		const data = await sheet.updateSheetData(setData, keyName, range, keyRow, dataStartRow, valueInputMode, valueRenderMode, true);
	}
	return this.helpers.returnJsonArray(items);
}
