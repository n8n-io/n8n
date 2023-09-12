import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

// Interface in Typeform
export interface ITypeformDefinition {
	fields: ITypeformDefinitionField[];
}

export interface ITypeformDefinitionField {
	id: string;
	title: string;
}

export interface ITypeformAnswer {
	field: ITypeformAnswerField;
	type: string;
	[key: string]: string | ITypeformAnswerField | object;
}

export interface ITypeformAnswerField {
	id: string;
	type: string;
	ref: string;
	[key: string]: string | object;
}

/**
 * Make an API request to Typeform
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs: query,
		uri: `https://api.typeform.com/${endpoint}`,
		json: true,
	};

	query = query || {};

	try {
		if (authenticationMethod === 'accessToken') {
			return await this.helpers.requestWithAuthentication.call(this, 'typeformApi', options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'typeformOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated Typeform endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	_dataKey?: string,
): Promise<any> {
	if (query === undefined) {
		query = {};
	}

	query.page_size = 200;
	query.page = 0;

	const returnData = {
		items: [] as IDataObject[],
	};

	let responseData;

	do {
		query.page += 1;

		responseData = await apiRequest.call(this, method, endpoint, body, query);

		returnData.items.push.apply(returnData.items, responseData.items as IDataObject[]);
	} while (responseData.page_count !== undefined && responseData.page_count > query.page);

	return returnData;
}

/**
 * Returns all the available forms
 *
 */
export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'forms';
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {});

	if (responseData.items === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const baseData of responseData.items) {
		returnData.push({
			name: baseData.title,
			value: baseData.id,
		});
	}

	return returnData;
}
