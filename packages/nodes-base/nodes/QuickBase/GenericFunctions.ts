import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export interface IQuickBaseApiFieldsKeyLabel {
	[key: string]: number;
}

export interface IQuickBaseApiFieldsKeyId {
	[key: number]: string;
}

export interface IQuickBaseApiRequest {
	method: 'POST' | 'GET' | 'DELETE';
	endpoint: string;
	body?: IDataObject;
	query?: IDataObject;
	isJson?: boolean;
}

export type TQuickBaseApiThis = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

import requestPromise = require('request-promise-native');

export async function getFieldsObject(this: TQuickBaseApiThis, tableId: string): Promise<{
	fieldsLabelKey: IQuickBaseApiFieldsKeyLabel
	fieldsIdKey: IQuickBaseApiFieldsKeyId
}> {
	const fieldsLabelKey: IQuickBaseApiFieldsKeyLabel = {};
	const fieldsIdKey: IQuickBaseApiFieldsKeyId = {};

	const data  = await quickbaseApiRequest.call(this, {
		method: 'GET',
		endpoint: '/fields',
		query: {
			tableId
		}
	});

	for(const field of data){
		fieldsLabelKey[field.label] = field.id;
		fieldsIdKey[field.id] = field.label;
	}

	return {
		fieldsLabelKey,
		fieldsIdKey
	};
}

export async function quickbaseApiRequest(this: TQuickBaseApiThis, {
	method,
	endpoint,
	body,
	query,
	isJson = true
}: IQuickBaseApiRequest){
	const credentials = this.getCredentials('quickbase');

	if(credentials === undefined){
		throw new Error('No credentials found!');
	}

	if(body === undefined){
		body = {};
	}

	if(query === undefined){
		query = {};
	}

	let workflow = {
		name: ''
	};

	// @ts-ignore - Property 'getWorkflow' does not exist on type 'ILoadOptionsFunctions'. ts(2339)
	if(this.getWorkflow !== undefined){
		// @ts-ignore - Property 'getWorkflow' does not exist on type 'ILoadOptionsFunctions'. ts(2339)
		workflow = this.getWorkflow();
	}

	const node = this.getNode();

	const headers: requestPromise.Options['headers'] = {
		'QB-Realm-Hostname': credentials.realm,
		'Authorization': `QB-USER-TOKEN ${credentials.userToken}`,
		'User-Agent': [
			`nodejs/${process.version}`,
			[
				'n8n',
				(workflow.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
				'quickbase',
				node.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
			].filter((val) => {
				return !!val;
			}).join('/')
		].join(' ')
	};

	if(isJson){
		headers['Content-Type'] = 'application/json; charset=UTF-8';
	}

	const options: requestPromise.OptionsWithUri = {
		method,
		qs: query,
		uri: `https://api.quickbase.com/v1/${endpoint}`,
		headers: headers,
	};

	if(isJson){
		options.json = true;
		options.body = body;
	}else{
		options.resolveWithFullResponse = true;
	}

	try {
		// @ts-ignore - Cannot invoke an object which is possibly 'undefined'.ts(2722)
		return await this.helpers.request(options);
	}catch(error){
		throw new Error([
			`Quick Base Error [${error.statusCode}]: ${error.response.body.message || error.message}.`,
			error.response.body.description,
			`Quick Base Ray ID: ${error.response.headers['qb-api-ray']}`
		].join('\n'));
	}
}

export async function quickbaseApiRequestFetchAll(
	this: TQuickBaseApiThis,
	req: IQuickBaseApiRequest,
	method: 'body' | 'qs' = 'body'
){
	if(!req.query){
		req.query = {};
	}

	if(!req.body){
		req.body = {};
	}

	if(!req.body.options){
		req.body.options = {};
	}

	const viaBody = method === 'body';

	let results = await quickbaseApiRequest.call(this, req);

	const batchSize = 0 + results.metadata.numRecords;

	if(viaBody){
		// @ts-ignore - Property does not exist on type. ts(2339)
		req.body.options.top = batchSize;
		// @ts-ignore - Property does not exist on type. ts(2339)
		req.body.options.skip = batchSize;
	}else{
		req.query.top = batchSize;
		req.query.skip = batchSize;
	}

	while(results.metadata.numRecords < results.metadata.totalRecords && results.metadata.skip < results.metadata.totalRecords){
		const batch = await quickbaseApiRequest.call(this, req);

		results.data = results.data.concat(batch.data);
		results.metadata.numRecords = results.data.length;
		results.metadata.totalRecords = results.metadata.totalRecords;

		if(viaBody){
			// @ts-ignore - Property does not exist on type. ts(2339)
			req.body.options.skip = batch.data.length;
		}else{
			req.query.skip = batch.data.length;
		}
	}

	return results;
}
