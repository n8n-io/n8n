import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	GoogleSheet,
	ValueRenderOption,
} from '../../../helper';

export async function read(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

	const spreadsheetId = this.getNodeParameter('sheetId', 0) as string;

	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const range = this.getNodeParameter('range', 0) as string;
	const sheet = new GoogleSheet(spreadsheetId, this);

	const rawData = this.getNodeParameter('rawData', 0) as boolean;

	const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

	let returnData: IDataObject[];
	if (!sheetData) {
		returnData = [];
	} else if (rawData === true) {
		const dataProperty = this.getNodeParameter('dataProperty', 0) as string;
		returnData = [
			{
				[dataProperty]: sheetData,
			},
		];
	} else {
		const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);
		const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

		returnData = sheet.structureArrayDataByColumn(sheetData, keyRow, dataStartRow);
	}

	if (returnData.length === 0 && options.continue) {
		returnData = [{}];
	}

	return this.helpers.returnJsonArray(returnData);
}
