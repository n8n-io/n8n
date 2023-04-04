import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

export interface IFormstackFieldDefinitionType {
	id: string;
	label: string;
	description: string;
	name: string;
	type: string;
	options: unknown;
	required: string;
	uniq: string;
	hidden: string;
	readonly: string;
	colspan: string;
	label_position: string;
	num_columns: string;
	date_format: string;
	time_format: string;
}

export interface IFormstackWebhookResponseBody {
	FormID: string;
	UniqueID: string;
}

export interface IFormstackSubmissionFieldContainer {
	field: string;
	value: string;
}

export enum FormstackFieldFormat {
	ID = 'id',
	Label = 'label',
	Name = 'name',
}

/**
 * Make an API request to Formstack
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs: query || {},
		uri: `https://www.formstack.com/api/v2/${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = (await this.getCredentials('formstackApi')) as IDataObject;

			options.headers!.Authorization = `Bearer ${credentials.accessToken}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'formstackOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated Formstack endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	dataKey: string,
	query?: IDataObject,
): Promise<any> {
	if (query === undefined) {
		query = {};
	}

	query.per_page = 200;
	query.page = 0;

	const returnData = {
		items: [] as IDataObject[],
	};

	let responseData;

	do {
		query.page += 1;

		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.items.push.apply(returnData.items, responseData[dataKey] as IDataObject[]);
	} while (
		responseData.total !== undefined &&
		Math.ceil(responseData.total / query.per_page) > query.page
	);

	return returnData;
}

/**
 * Returns all the available forms
 *
 */
export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'form.json';
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'forms', {
		folders: false,
	});

	if (responseData.items === undefined) {
		throw new Error('No data got returned');
	}
	const returnData: INodePropertyOptions[] = [];
	for (const baseData of responseData.items) {
		returnData.push({
			name: baseData.name,
			value: baseData.id,
		});
	}
	return returnData;
}

/**
 * Returns all the fields of a form
 *
 */
export async function getFields(
	this: IWebhookFunctions,
	formID: string,
): Promise<Record<string, IFormstackFieldDefinitionType>> {
	const endpoint = `form/${formID}.json`;
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'fields');

	if (responseData.items === undefined) {
		throw new Error('No form fields meta data got returned');
	}

	const fields = responseData.items as IFormstackFieldDefinitionType[];
	const fieldMap: Record<string, IFormstackFieldDefinitionType> = {};

	fields.forEach((field) => {
		fieldMap[field.id] = field;
	});

	return fieldMap;
}

/**
 * Returns all the fields of a form
 *
 */
export async function getSubmission(
	this: ILoadOptionsFunctions | IWebhookFunctions,
	uniqueId: string,
): Promise<IFormstackSubmissionFieldContainer[]> {
	const endpoint = `submission/${uniqueId}.json`;
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'data');

	if (responseData.items === undefined) {
		throw new Error('No form fields meta data got returned');
	}

	return responseData.items as IFormstackSubmissionFieldContainer[];
}
