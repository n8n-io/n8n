import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import * as moment from 'moment';

export async function theHiveApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('theHiveApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, { Authorization: `Bearer ${credentials.ApiKey}` });

	let options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `${credentials.url}/api${resource}`,
		body,
		rejectUnauthorized: credentials.allowUnauthorizedCerts as boolean,
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
		return await this.helpers.request!(options);
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
	return tags.split(',').filter(tag => tag !== ' ' && tag);
}

export function prepareOptional(optionals: IDataObject): IDataObject {
	const response: IDataObject = {};
	for (const key in optionals) {
		if (optionals[key] !== undefined && optionals[key] !== null && optionals[key] !== '') {
			if (moment(optionals[key] as string, moment.ISO_8601).isValid()) {
				response[key] = Date.parse(optionals[key] as string);
			} else if (key === 'artifacts') {
				response[key] = JSON.parse(optionals[key] as string);
			} else if (key === 'tags') {
				response[key] = splitTags(optionals[key] as string);
			} else {
				response[key] = optionals[key];
			}
		}
	}
	return response;
}

export function prepareSortQuery(sort: string, body: { query: [IDataObject] }) {
	if (sort) {
		const field = sort.substring(1);
		const value = sort.charAt(0) === '+' ? 'asc' : 'desc';
		const sortOption: IDataObject = {};
		sortOption[field] = value;
		body.query.push(
			{
				'_name': 'sort',
				'_fields': [
					sortOption,
				],
			},
		);
	}
}

export function prepareRangeQuery(range: string, body: { 'query': Array<{}> }) {
	if (range && range !== 'all') {
		body['query'].push(
			{
				'_name': 'page',
				'from': parseInt(range.split('-')[0], 10),
				'to': parseInt(range.split('-')[1], 10),
			},
		);
	}
}
