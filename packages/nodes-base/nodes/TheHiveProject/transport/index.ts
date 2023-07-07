import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

import { jsonParse } from 'n8n-workflow';
import { convertCustomFieldUiToObject } from '../helpers/utils';

export async function theHiveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | FormData = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('theHiveProjectApi');

	let options: IHttpRequestOptions = {
		method,
		qs: query,
		url: uri || `${credentials.url}/api${resource}`,
		body,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts as boolean,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	return this.helpers.requestWithAuthentication.call(this, 'theHiveProjectApi', options);
}

export async function theHiveApiListQuery(
	this: IExecuteFunctions,
	listResource: string,
	filters?: IDataObject,
	sortFields?: IDataObject[],
	limit?: number,
) {
	const query: IDataObject[] = [
		{
			_name: listResource,
		},
	];

	if (filters && Object.keys(filters).length) {
		if (filters.customFieldsUi) {
			const customFields = convertCustomFieldUiToObject(filters.customFieldsUi as IDataObject);

			for (const [key, value] of Object.entries(customFields || {})) {
				filters[`customFields.${key}`] = value;
			}

			delete filters.customFieldsUi;
		}

		const filter = {
			_name: 'filter',
			_and: Object.keys(filters).map((field) => ({
				_eq: {
					_field: field,
					_value: filters[field],
				},
			})),
		};

		query.push(filter);
	}

	if (sortFields?.length) {
		const sort = {
			_name: 'sort',
			_fields: sortFields.map((field) => {
				return {
					[`${field.field as string}`]: field.direction as string,
				};
			}),
		};

		query.push(sort);
	}

	if (limit) {
		const pagination = {
			_name: 'page',
			from: 0,
			to: limit,
		};

		query.push(pagination);
	}

	const responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

	return responseData;
}

export async function prepareCustomFields(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	additionalFields: IDataObject,
	jsonParameters = false,
): Promise<IDataObject | undefined> {
	// Check if the additionalFields object contains customFields
	if (jsonParameters) {
		let customFieldsJson = additionalFields.customFieldsJson;
		// Delete from additionalFields as some operations (e.g. alert:update) do not run prepareOptional
		// which would remove the extra fields
		delete additionalFields.customFieldsJson;

		if (typeof customFieldsJson === 'string') {
			try {
				customFieldsJson = jsonParse(customFieldsJson);
			} catch (error) {
				throw new Error('Invalid JSON for customFields');
			}
		}

		if (typeof customFieldsJson === 'object') {
			const customFields = Object.keys(customFieldsJson as IDataObject).reduce((acc, curr) => {
				acc[`customFields.${curr}`] = (customFieldsJson as IDataObject)[curr];
				return acc;
			}, {} as IDataObject);

			return customFields;
		} else if (customFieldsJson) {
			throw Error('customFieldsJson value is invalid');
		}
	} else if (additionalFields.customFieldsUi) {
		// Get Custom Field Types from TheHive
		const requestResult = await theHiveApiRequest.call(this, 'GET', '/customField');

		// Build reference to type mapping object
		const referenceTypeMapping = requestResult.reduce(
			(acc: IDataObject, curr: IDataObject) => ((acc[curr.reference as string] = curr.type), acc),
			{},
		);

		// Build "fieldName": {"type": "value"} objects
		const customFieldsUi = additionalFields.customFieldsUi as IDataObject;
		const customFields: IDataObject = (customFieldsUi?.customFields as IDataObject[]).reduce(
			(acc: IDataObject, curr: IDataObject) => {
				const fieldName = curr.field as string;

				// Might be able to do some type conversions here if needed, TODO
				const updatedField = `customFields.${fieldName}.${[referenceTypeMapping[fieldName]]}`;
				acc[updatedField] = curr.value;
				return acc;
			},
			{} as IDataObject,
		);

		delete additionalFields.customFieldsUi;
		return customFields;
	}
	return undefined;
}
