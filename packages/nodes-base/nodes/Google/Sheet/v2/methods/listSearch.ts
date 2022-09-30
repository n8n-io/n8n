import { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
import { sortLoadOptions } from '../helpers/GoogleSheets.utils';
import { apiRequestAllItems } from '../transport';

export async function spreadSheetsSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const returnData: INodeListSearchItems[] = [];
		const query: string[] = [];
		if (filter) {
			query.push(`name contains '${filter.replace("'", "\\'")}'`);
		}
		query.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
		const qs = {
			pageSize: 50,
			orderBy: 'modifiedTime desc',
			fields: 'nextPageToken, files(id, name, webViewLink)',
			q: query.join(' and '),
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
				url: sheet.webViewLink as string,
			});
		}
		return { results: sortLoadOptions(returnData) };
	} catch (error) {
		return { results: [] };
	}
}
