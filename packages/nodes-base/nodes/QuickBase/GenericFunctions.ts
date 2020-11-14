import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import requestPromise = require('request-promise-native');

export async function quickbaseApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	isJson: boolean = true,
	fetchAll: boolean | 'qs' = false
): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('quickbase');

	if(credentials === undefined){
		throw new Error('No credentials found!');
	}

	if(query === undefined){
		query = {};
	}

	const workflow = this.getWorkflow();
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
		const results = await this.helpers.request(options);

		if(!fetchAll){
			return results;
		}

		const viaBody = fetchAll !== 'qs';

		if(viaBody){
			if(!options.body.options){
				options.body.options = {};
			}
		}

		const batchSize = 0 + results.metadata.numRecords;

		if(viaBody){
			options.body.options.top = batchSize;
			options.body.options.skip = batchSize;
		}else{
			options.qs.top = batchSize;
			options.qs.skip = batchSize;
		}

		while(results.metadata.numRecords < results.metadata.totalRecords && results.metadata.skip < results.metadata.totalRecords){
			const batch = await this.helpers.request(options);

			results.data = results.data.concat(batch.data);
			results.metadata.numRecords = results.data.length;
			results.metadata.totalRecords = results.metadata.totalRecords;

			if(viaBody){
				options.body.options.skip = batch.data.length;
			}else{
				options.qs.skip = batch.data.length;
			}
		}

		return results;
	}catch(error){
		throw new Error([
			`Quick Base Error [${error.statusCode}]: ${error.response.body.message}.`,
			error.response.body.description,
			`Quick Base Ray ID: ${error.response.headers['qb-api-ray']}`
		].join('\n'));
	}
}
