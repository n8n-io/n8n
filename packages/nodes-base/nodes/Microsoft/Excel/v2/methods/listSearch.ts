import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getExcelCredentialType, microsoftApiRequest } from '../transport';

// listSearch context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).

const WORKBOOK_EXTENSIONS = ['.xlsx', '.xlsm'];

type DriveItem = {
	id?: string;
	name?: string;
	webUrl?: string;
	file?: IDataObject;
};

type DriveSearchResponse = {
	value?: DriveItem[];
	'@odata.nextLink'?: string;
};

function workbookExtension(item: DriveItem): string | undefined {
	if (item.file === undefined) return undefined;
	const name = (item.name ?? '').toLowerCase();
	return WORKBOOK_EXTENSIONS.find((extension) => name.endsWith(extension));
}

export async function searchWorkbooks(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	if (getExcelCredentialType.call(this) === 'microsoftEntraServicePrincipalApi') {
		// App-only Graph can't search a drive — steer the user to "By ID".
		throw new NodeOperationError(
			this.getNode(),
			'Search is not supported with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph cannot search a drive. Switch the Workbook field to "By ID" and paste the workbook ID, or use an OAuth2 credential.',
			},
		);
	}
	const trimmed = filter?.trim() ?? '';
	const q = trimmed === '' ? WORKBOOK_EXTENSIONS.join(' OR ') : trimmed;

	const response: DriveSearchResponse = paginationToken
		? await microsoftApiRequest.call(
				this,
				'GET',
				'',
				undefined,
				undefined,
				paginationToken, // paginationToken contains the full URL
				undefined,
				0,
			)
		: await microsoftApiRequest.call(
				this,
				'GET',
				`/drive/root/search(q='${q}')`,
				undefined,
				{
					select: 'id,name,webUrl,file',
					$top: 100,
				},
				undefined,
				undefined,
				0,
			);

	const results: INodeListSearchItems[] = [];
	for (const item of response.value ?? []) {
		const extension = workbookExtension(item);
		if (extension === undefined) continue;
		const name = item.name ?? '';
		results.push({
			name: name.slice(0, -extension.length),
			value: item.id ?? '',
			url: item.webUrl,
		});
	}

	return {
		results,
		paginationToken: response['@odata.nextLink'],
	};
}

export async function getWorksheetsList(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
	const workbookId = workbookRLC.value as string;
	let workbookURL = (workbookRLC.cachedResultUrl as string) ?? '';

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
		undefined,
		undefined,
		0,
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
	const workbookId = workbookRLC.value as string;
	let workbookURL = (workbookRLC.cachedResultUrl as string) ?? '';

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
		undefined,
		undefined,
		undefined,
		0,
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
			undefined,
			undefined,
			0,
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
