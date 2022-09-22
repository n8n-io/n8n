import { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';

export async function spreadSheetsSearch(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	try {
		const returnData: INodeListSearchItems[] = [];
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
		return { results: returnData };
	} catch (error) {
		return { results: [] };
	}
}
