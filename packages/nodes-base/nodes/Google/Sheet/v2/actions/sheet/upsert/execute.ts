import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	GoogleSheet,
	ISheetUpdateData,
	ValueInputOption,
	ValueRenderOption,
} from '../../../helper';

export async function upsert(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const rawData = this.getNodeParameter('rawData', 0) as boolean;
	const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;

	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const range = this.getNodeParameter('range', 0) as string;
	const sheet = new GoogleSheet(spreadsheetId, this);

	const valueInputMode = (options.valueInputMode || 'RAW') as ValueInputOption;
	const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const items = this.getInputData();

	if (rawData === true) {
		const dataProperty = this.getNodeParameter('dataProperty', 0) as string;

		const updateData: ISheetUpdateData[] = [];
		updateData.push({
			range,
			values: items[index].json[dataProperty] as string[][],
		});

		const data = await sheet.batchUpdate(updateData, valueInputMode);
	} else {
		const keyName = this.getNodeParameter('key', 0) as string;
		const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);
		const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);

		const setData: IDataObject[] = [];

		setData.push(items[index].json);

		const data = await sheet.updateSheetData(setData, keyName, range, keyRow, dataStartRow, valueInputMode, valueRenderMode, true);
	}
	return this.helpers.returnJsonArray(items);
}
