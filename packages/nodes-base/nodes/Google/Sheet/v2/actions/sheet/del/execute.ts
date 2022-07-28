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
	IToDelete,
} from '../../../helper';

export async function del(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
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

	const requests: IDataObject[] = [];
	const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

	const deletePropertyToDimensions: IDataObject = {
		'columns': 'COLUMNS',
		'rows': 'ROWS',
	};

	for (const propertyName of Object.keys(deletePropertyToDimensions)) {
		if (toDelete[propertyName] !== undefined) {
			toDelete[propertyName]!.forEach(range => {
				requests.push({
					deleteDimension: {
						range: {
							sheetId: range.sheetId,
							dimension: deletePropertyToDimensions[propertyName] as string,
							startIndex: range.startIndex,
							endIndex: parseInt(range.startIndex.toString(), 10) + parseInt(range.amount.toString(), 10),
						},
					},
				});
			});
		}
	}

	const data = await sheet.spreadsheetBatchUpdate(requests);

	const items = this.getInputData();

	return this.helpers.returnJsonArray(items[index]);
}
