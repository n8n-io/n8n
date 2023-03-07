import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
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
		uri: uri || `https://people.googleapis.com/v1${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleContactsOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

export const allFields = [
	'addresses',
	'biographies',
	'birthdays',
	'coverPhotos',
	'emailAddresses',
	'events',
	'genders',
	'imClients',
	'interests',
	'locales',
	'memberships',
	'metadata',
	'names',
	'nicknames',
	'occupations',
	'organizations',
	'phoneNumbers',
	'photos',
	'relations',
	'residences',
	'sipAddresses',
	'skills',
	'urls',
	'userDefined',
];

export function cleanData(responseData: any) {
	const fields = ['emailAddresses', 'phoneNumbers', 'relations', 'events', 'addresses'];
	const newResponseData = [];
	if (!Array.isArray(responseData)) {
		responseData = [responseData];
	}
	for (let y = 0; y < responseData.length; y++) {
		const object: { [key: string]: any } = {};
		for (const key of Object.keys(responseData[y] as IDataObject)) {
			if (key === 'metadata') {
				continue;
			}
			if (key === 'photos') {
				responseData[y][key] = responseData[y][key].map((photo: IDataObject) => photo.url);
			}
			if (key === 'names') {
				delete responseData[y][key][0].metadata;
				responseData[y][key] = responseData[y][key][0];
			}
			if (key === 'memberships') {
				for (let i = 0; i < responseData[y][key].length; i++) {
					responseData[y][key][i] = responseData[y][key][i].metadata.source.id;
				}
			}
			if (key === 'birthdays') {
				for (let i = 0; i < responseData[y][key].length; i++) {
					const { year, month, day } = responseData[y][key][i].date;
					responseData[y][key][i] = `${month}/${day}/${year}`;
				}
				responseData[y][key] = responseData[y][key][0];
			}
			if (key === 'userDefined' || key === 'organizations' || key === 'biographies') {
				for (let i = 0; i < responseData[y][key].length; i++) {
					delete responseData[y][key][i].metadata;
				}
			}
			if (fields.includes(key)) {
				const value: { [key: string]: any } = {};
				for (const data of responseData[y][key]) {
					let result;
					if (value[data.type] === undefined) {
						value[data.type] = [];
					}

					if (key === 'relations') {
						result = data.person;
					} else if (key === 'events') {
						const { year, month, day } = data.date;
						result = `${month}/${day}/${year}`;
					} else if (key === 'addresses') {
						delete data.metadata;
						result = data;
					} else {
						result = data.value;
					}
					value[data.type].push(result);
					delete data.type;
				}
				if (Object.keys(value).length > 0) {
					object[key] = value;
				}
			} else {
				object[key] = responseData[y][key];
			}
		}
		newResponseData.push(object);
	}
	return newResponseData;
}
