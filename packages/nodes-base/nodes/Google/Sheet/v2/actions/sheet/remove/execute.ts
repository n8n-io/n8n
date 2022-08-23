import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

import {
	getSpreadsheetId,
} from '../../../helper';

export async function remove(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
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

	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	const requests = [{
		deleteSheet: {
			sheetId: sheetWithinDocument,
		},
	}];

	const items = this.getInputData();

	const returnData: IDataObject[] = [];
	let responseData;

	responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests });
	delete responseData.replies;
	returnData.push(responseData);

	return this.helpers.returnJsonArray(items[index].json);
}
