import type { OptionsWithUri } from 'request';
import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { UpdateSummary } from '../helpers/interfaces';

export async function microsoftApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://graph.microsoft.com/v1.0/me${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		return await this.helpers.requestOAuth2.call(this, 'microsoftExcelOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.value.length !== 0);

	return returnData;
}

export async function updateOrUpsertRange(
	this: IExecuteFunctions,
	updateSummary: UpdateSummary,
	workbookId: string,
	worksheetId: string,
	range: string,
	columnsRow: string[],
	upsert = false,
) {
	const { appendData, updatedRows } = updateSummary;
	let { updatedData } = updateSummary;

	if (upsert && appendData.length) {
		const appendValues: string[][] = [];

		for (const [index, item] of appendData.entries()) {
			const updateRow: string[] = [];

			for (const column of columnsRow) {
				updateRow.push(item[column] as string);
			}

			appendValues.push(updateRow);
			updatedRows.push(index + updatedData.length);
		}

		updatedData = updatedData.concat(appendValues);
		const [rangeFrom, rangeTo] = range.split(':');
		const cellDataTo = rangeTo.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];

		range = `${rangeFrom}:${cellDataTo[1]}${Number(cellDataTo[2]) + appendValues.length}`;
	}

	return microsoftApiRequest.call(
		this,
		'PATCH',
		`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
		{ values: updatedData },
	);
}
