import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../transport';

export async function searchWorkbooks(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const q = filter ? encodeURI(`.xlsx AND ${filter}`) : '.xlsx';

	let response: IDataObject = {};

	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'',
			undefined,
			undefined,
			paginationToken, // paginationToken contains the full URL
		);
	} else {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			`/drive/root/search(q='${q}')`,
			undefined,
			{
				select: 'id,name,webUrl',
				$top: 100,
			},
		);
	}

	return {
		results: (response.value as IDataObject[]).map((workbook: IDataObject) => {
			return {
				name: (workbook.name as string).replace('.xlsx', ''),
				value: workbook.id as string,
				url: workbook.webUrl as string,
			};
		}),
		paginationToken: response['@odata.nextLink'],
	};
}

export async function getWorksheetsList(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
	const workbookId = workbookRLC.value as string;
	let workbookURL = workbookRLC.cachedResultUrl as string;

	if (workbookURL.includes('1drv.ms')) {
		workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
	}

	let response: IDataObject = {};

	response = await microsoftApiRequest.call(
		this,
		'GET',
		`/drive/items/${workbookId}/workbook/worksheets`,
		undefined,
		{
			select: 'id,name',
		},
	);

	return {
		results: (response.value as IDataObject[]).map((worksheet: IDataObject) => ({
			name: worksheet.name as string,
			value: worksheet.id as string,
			url: `${workbookURL}&activeCell=${encodeURIComponent(worksheet.name as string)}!A1`,
		})),
	};
}

export async function getWorksheetTables(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
	const workbookId = workbookRLC.value as string;
	let workbookURL = workbookRLC.cachedResultUrl as string;

	if (workbookURL.includes('1drv.ms')) {
		workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
	}

	const worksheetId = this.getNodeParameter('worksheet', undefined, {
		extractValue: true,
	}) as string;

	let response: IDataObject = {};

	response = await microsoftApiRequest.call(
		this,
		'GET',
		`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
		undefined,
	);

	const results: INodeListSearchItems[] = [];

	for (const table of response.value as IDataObject[]) {
		const name = table.name as string;
		const value = table.id as string;

		const { address } = await microsoftApiRequest.call(
			this,
			'GET',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${value}/range`,
			undefined,
			{
				select: 'address',
			},
		);

		const [sheetName, sheetRange] = address.split('!' as string);

		const url = `${workbookURL}&activeCell=${encodeURIComponent(sheetName as string)}${
			sheetRange ? '!' + (sheetRange as string) : ''
		}`;

		results.push({ name, value, url });
	}

	return { results };
}
