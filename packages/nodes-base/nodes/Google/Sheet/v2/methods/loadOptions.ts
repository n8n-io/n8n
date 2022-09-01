import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';

import { getSpreadsheetId, GoogleSheet } from '../helper';

export async function getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const resourceType = this.getCurrentNodeParameter('resourceLocator') as string;
	let resourceValue = '';
	if (resourceType === 'byId') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetId') as string;
	} else if (resourceType === 'byUrl') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetUrl') as string;
	} else if (resourceType === 'fromList') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetName') as string;
	}
	const spreadsheetId = getSpreadsheetId(resourceType, resourceValue) as string;

	const sheet = new GoogleSheet(spreadsheetId, this);
	const responseData = await sheet.spreadsheetGetSheets();

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const sheet of responseData.sheets!) {
		if (sheet.properties!.sheetType !== 'GRID') {
			continue;
		}

		returnData.push({
			name: sheet.properties!.title as string,
			value: sheet.properties!.sheetId as unknown as string,
		});
	}

	return returnData;
}

export async function getSheetIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const qs = {
		pageSize: 50,
		orderBy: 'modifiedTime desc',
		fields: 'nextPageToken, files(id, name)',
		q: "mimeType = 'application/vnd.google-apps.spreadsheet'",
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
	};

	const sheets = await apiRequestAllItems.call(
		this,
		'files',
		'GET',
		'',
		{},
		qs,
		'https://www.googleapis.com/drive/v3/files',
	);
	for (const sheet of sheets) {
		returnData.push({
			name: sheet.name,
			value: sheet.id,
		});
	}
	return returnData;
}

export async function getSheetHeaderRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const resourceType = this.getCurrentNodeParameter('resourceLocator') as string;
	let resourceValue = '';
	if (resourceType === 'byId') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetId') as string;
	} else if (resourceType === 'byUrl') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetUrl') as string;
	} else if (resourceType === 'fromList') {
		resourceValue = this.getCurrentNodeParameter('spreadsheetName') as string;
	}
	const spreadsheetId = getSpreadsheetId(resourceType, resourceValue) as string;

	const sheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getCurrentNodeParameter('sheetName') as string;
	const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	const sheetData = await sheet.getData(`${sheetName}!1:1`, 'FORMATTED_VALUE');

	if (sheetData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const columns = sheet.testFilter(sheetData, 0, 0);

	const returnData: INodePropertyOptions[] = [];

	for (const column of columns) {
		returnData.push({
			name: column as unknown as string,
			value: column as unknown as string,
		});
	}

	return returnData;
}
