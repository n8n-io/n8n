import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	GristCredentials,
	GristDefinedData,
	GristFilterProperties,
	GristSortProperties,
} from './types';

export async function gristApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | number[] = {},
	qs: IDataObject = {},
) {
	const {
		apiKey,
		planType,
		customSubdomain,
	} = await this.getCredentials('gristApi') as GristCredentials;

	const subdomain = planType === 'free' ? 'docs' : customSubdomain;

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		method,
		uri: `https://${subdomain}.getgrist.com/api${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function parseSortProperties(sortProperties: GristSortProperties) {
	return sortProperties.reduce((acc, cur, curIdx) => {
		if (cur.direction === 'desc') acc += '-';
		acc += cur.field;
		if (curIdx !== sortProperties.length - 1) acc += ',';
		return acc;
	}, '');
}

export function parseFilterProperties(filterProperties: GristFilterProperties) {
 return filterProperties.reduce<{ [key: string]: string[]; }>((acc, cur) => {
		acc[cur.field] = acc[cur.field] ?? [];
		const values = cur.values.split(',').map(v => v.trim());
		acc[cur.field].push(...values);
		return acc;
	}, {});
}

export function parseFieldsToSend(fieldsToSendProperties: GristDefinedData) {
	return fieldsToSendProperties.reduce<{ [key: string]: string; }>((acc, cur) => {
		acc[cur.fieldId] = cur.fieldValue;
		return acc;
	}, {});
}
