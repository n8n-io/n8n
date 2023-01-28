import type { OptionsWithUri } from 'request';
import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

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

export function prepareOutput(
	this: IExecuteFunctions,
	responseData: { values: string[][] },
	rawData: boolean,
	keyRow = 0,
	firstDataRow = 1,
) {
	const returnData: INodeExecutionData[] = [];

	if (!rawData) {
		if (responseData.values === null) {
			throw new NodeOperationError(this.getNode(), 'Operation did not return data');
		}

		const columns = responseData.values[keyRow];
		for (let rowIndex = firstDataRow; rowIndex < responseData.values.length; rowIndex++) {
			const data: IDataObject = {};
			for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
				data[columns[columnIndex]] = responseData.values[rowIndex][columnIndex];
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ ...data }),
				{ itemData: { item: rowIndex } },
			);

			returnData.push(...executionData);
		}
	} else {
		const dataProperty = this.getNodeParameter('dataProperty', 0) as string;
		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray({ [dataProperty]: responseData }),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	}

	return returnData;
}
