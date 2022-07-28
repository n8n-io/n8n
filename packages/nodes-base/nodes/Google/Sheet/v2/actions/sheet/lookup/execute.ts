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
	ILookupValues,
	ValueRenderOption,
} from '../../../helper';

export async function lookup(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

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

	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const range = this.getNodeParameter('range', 0) as string;
	const sheet = new GoogleSheet(spreadsheetId, this);

	const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

	if (sheetData === undefined) {
		return [];
	}

	const dataStartRow = parseInt(this.getNodeParameter('dataStartRow', 0) as string, 10);
	const keyRow = parseInt(this.getNodeParameter('keyRow', 0) as string, 10);

	const lookupValues: ILookupValues[] = [];
		lookupValues.push({
			lookupColumn: this.getNodeParameter('lookupColumn', index) as string,
			lookupValue: this.getNodeParameter('lookupValue', index) as string,
		});

	let returnData = await sheet.lookupValues(sheetData, keyRow, dataStartRow, lookupValues, options.returnAllMatches as boolean | undefined);

	if (returnData.length === 0 && options.continue && options.returnAllMatches) {
		returnData = [{}];
	} else if (returnData.length === 1 && Object.keys(returnData[0]).length === 0 && !options.continue && !options.returnAllMatches) {
		returnData = [];
	}
	return this.helpers.returnJsonArray(returnData);
}
