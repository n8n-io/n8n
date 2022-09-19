import { ILoadOptionsFunctions, INodePropertyOptions, NodeOperationError } from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
import { ResourceLocator } from '../helpers/GoogleSheets.types';

export async function getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const resourceType = this.getCurrentNodeParameter('resourceLocator') as ResourceLocator;
		const spreadSheetIdentifier = this.getCurrentNodeParameter('spreadSheetIdentifier') as string;
		const spreadsheetId = getSpreadsheetId(resourceType, spreadSheetIdentifier) as string;

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
	} catch (error) {
		return [];
	}
}

export async function getSheetIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
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
				name: sheet.name as string,
				value: sheet.id as string,
			});
		}
		return returnData;
	} catch (error) {
		return [];
	}
}

export async function getSheetHeaderRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const resourceType = this.getCurrentNodeParameter('resourceLocator') as ResourceLocator;
		const spreadSheetIdentifier = this.getCurrentNodeParameter('spreadSheetIdentifier') as string;
		const spreadsheetId = getSpreadsheetId(resourceType, spreadSheetIdentifier) as string;

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
	} catch (error) {
		return [];
	}
}
