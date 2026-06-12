import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { parseWorkbook } from '../helpers/utils';
import {
	fetchWorkbookList,
	getWorkbookSourceForPicker,
	stripWorkbookExtension,
} from '../helpers/workbookSource';
import { microsoftApiRequest } from '../transport';

export async function searchWorkbooks(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Source lives in the operation's collapsible options. When left unset it falls
	// back to the node-version default (OneDrive for existing nodes, everywhere for new).
	const source = getWorkbookSourceForPicker(this);

	const { items, paginationToken: nextToken } = await fetchWorkbookList.call(this, source, {
		filter,
		paginationToken,
	});

	return {
		results: items.map((item) => ({
			name: stripWorkbookExtension(item.name),
			// Non-personal workbooks live in another drive, so the value carries it as
			// "{driveId}/{itemId}". Personal OneDrive keeps a bare id (-> /me/drive).
			value: item.driveId ? `${item.driveId}/${item.id}` : item.id,
			url: item.webUrl,
		})),
		paginationToken: nextToken,
	};
}

export async function getWorksheetsList(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
	const { root, workbookId } = parseWorkbook(workbookRLC.value as string);
	let workbookURL = (workbookRLC.cachedResultUrl as string) ?? '';

	if (workbookURL.includes('1drv.ms')) {
		workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
	}

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`${root}/items/${workbookId}/workbook/worksheets`,
		undefined,
		{
			select: 'id,name',
		},
	);

	return {
		results: (response.value as IDataObject[]).map((worksheet: IDataObject) => ({
			name: worksheet.name as string,
			value: worksheet.id as string,
			url: workbookURL
				? `${workbookURL}&activeCell=${encodeURIComponent(worksheet.name as string)}!A1`
				: undefined,
		})),
	};
}

export async function getWorksheetTables(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
	const { root, workbookId } = parseWorkbook(workbookRLC.value as string);
	let workbookURL = (workbookRLC.cachedResultUrl as string) ?? '';

	if (workbookURL.includes('1drv.ms')) {
		workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
	}

	const worksheetId = this.getNodeParameter('worksheet', undefined, {
		extractValue: true,
	}) as string;

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`${root}/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
		undefined,
	);

	const results: INodeListSearchItems[] = [];

	for (const table of response.value as IDataObject[]) {
		const name = table.name as string;
		const value = table.id as string;

		const { address } = await microsoftApiRequest.call(
			this,
			'GET',
			`${root}/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${value}/range`,
			undefined,
			{
				select: 'address',
			},
		);

		const [sheetName, sheetRange] = address.split('!' as string);

		let url;
		if (workbookURL) {
			url = `${workbookURL}&activeCell=${encodeURIComponent(sheetName as string)}${
				sheetRange ? '!' + (sheetRange as string) : ''
			}`;
		}

		results.push({ name, value, url });
	}

	return { results };
}
