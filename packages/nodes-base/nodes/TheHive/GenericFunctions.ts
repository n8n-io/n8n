import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, jsonParse, NodeApiError } from 'n8n-workflow';

import moment from 'moment';
import { Eq } from './QueryFunctions';

export async function theHiveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('theHiveApi');

	let options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `${credentials.url}/api${resource}`,
		body,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts as boolean,
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
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'theHiveApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// Helpers functions
export function mapResource(resource: string): string {
	switch (resource) {
		case 'alert':
			return 'alert';
		case 'case':
			return 'case';
		case 'observable':
			return 'case_artifact';
		case 'task':
			return 'case_task';
		case 'log':
			return 'case_task_log';
		default:
			return '';
	}
}

export function splitTags(tags: string): string[] {
	return tags.split(',').filter((tag) => tag !== ' ' && tag);
}

export function prepareOptional(optionals: IDataObject): IDataObject {
	const response: IDataObject = {};
	for (const key in optionals) {
		if (optionals[key] !== undefined && optionals[key] !== null && optionals[key] !== '') {
			if (['customFieldsJson', 'customFieldsUi'].indexOf(key) > -1) {
				continue; // Ignore customFields, they need special treatment
			} else if (moment(optionals[key] as string, moment.ISO_8601).isValid()) {
				response[key] = Date.parse(optionals[key] as string);
			} else if (key === 'artifacts') {
				try {
					response[key] = jsonParse(optionals[key] as string);
				} catch (error) {
					throw new Error('Invalid JSON for artifacts');
				}
			} else if (key === 'tags') {
				response[key] = splitTags(optionals[key] as string);
			} else {
				response[key] = optionals[key];
			}
		}
	}
	return response;
}

export async function prepareCustomFields(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	additionalFields: IDataObject,
	jsonParameters = false,
): Promise<IDataObject | undefined> {
	// Check if the additionalFields object contains customFields
	if (jsonParameters === true) {
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
		const credentials = await this.getCredentials('theHiveApi');
		const version = credentials.apiVersion;
		const endpoint = version === 'v1' ? '/customField' : '/list/custom_fields';

		const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint as string);

		// Convert TheHive3 response to the same format as TheHive 4
		// [{name, reference, type}]
		const hiveCustomFields =
			version === 'v1'
				? requestResult
				: Object.keys(requestResult).map((key) => requestResult[key]);
		// Build reference to type mapping object
		const referenceTypeMapping = hiveCustomFields.reduce(
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

export function buildCustomFieldSearch(customFields: IDataObject): IDataObject[] {
	const searchQueries: IDataObject[] = [];

	Object.keys(customFields).forEach((customFieldName) => {
		searchQueries.push(Eq(customFieldName, customFields[customFieldName]));
	});
	return searchQueries;
}

export function prepareSortQuery(sort: string, body: { query: [IDataObject] }) {
	if (sort) {
		const field = sort.substring(1);
		const value = sort.charAt(0) === '+' ? 'asc' : 'desc';
		const sortOption: IDataObject = {};
		sortOption[field] = value;
		body.query.push({
			_name: 'sort',
			_fields: [sortOption],
		});
	}
}

export function prepareRangeQuery(range: string, body: { query: Array<{}> }) {
	if (range && range !== 'all') {
		body['query'].push({
			_name: 'page',
			from: parseInt(range.split('-')[0], 10),
			to: parseInt(range.split('-')[1], 10),
		});
	}
}
