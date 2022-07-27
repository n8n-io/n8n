import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import {
	apiRequest,
	apiRequestAllItems,
} from '../transport';

import {
	GoogleSheet,
} from '../helper';

export async function getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const spreadsheetId = this.getCurrentNodeParameter('sheetId') as string;

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
	const returnData : INodePropertyOptions[] = [];
	let qs = {
		pageSize: 50,
		orderBy: "modifiedTime desc",
		fields: "nextPageToken, files(id, name)",
		q: "mimeType = 'application/vnd.google-apps.spreadsheet'",
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
	};

	const sheets = await apiRequestAllItems.call(this, 'files', 'GET', '', {}, qs, 'https://www.googleapis.com/drive/v3/files');
	for (const sheet of sheets) {
		returnData.push({
			name: sheet.name,
			value: sheet.id,
		});
	}
	return returnData;
}
