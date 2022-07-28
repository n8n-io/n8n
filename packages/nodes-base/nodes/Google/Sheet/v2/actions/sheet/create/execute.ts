import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
	hexToRgb,
} from '../../../transport';

import {
	getSpreadsheetId,
} from '../../../helper';

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

	let responseData;

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
	const simple = this.getNodeParameter('simple', 0) as boolean;
	const properties = { ...options };

	if (options.tabColor) {
		const { red, green, blue } = hexToRgb(options.tabColor as string)!;
		properties.tabColor = { red: red / 255, green: green / 255, blue: blue / 255 };
	}

	const requests = [{
		addSheet: {
			properties,
		},
	}];

	responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests });

	if (simple === true) {
		Object.assign(responseData, responseData.replies[0].addSheet.properties);
		delete responseData.replies;
	}

	return this.helpers.returnJsonArray(responseData);
}
