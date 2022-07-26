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

export async function remove(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const returnData: IDataObject[] = [];

	let responseData;
	const sheetId = this.getNodeParameter('id', index) as string;
	const spreadsheetId = this.getNodeParameter('sheetId', index) as string;
	const requests = [{
		deleteSheet: {
			sheetId,
		},
	}];

	responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests });
	delete responseData.replies;
	returnData.push(responseData);

	return this.helpers.returnJsonArray(returnData);
}
