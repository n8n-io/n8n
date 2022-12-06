import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, INodePropertyOptions, JsonObject, NodeApiError } from 'n8n-workflow';

export async function serviceNowApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const headers = {} as IDataObject;
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;

	let credentials;

	if (authenticationMethod === 'basicAuth') {
		credentials = await this.getCredentials('serviceNowBasicApi');
	} else {
		credentials = await this.getCredentials('serviceNowOAuth2Api');
	}

	const options: OptionsWithUri = {
		headers,
		method,
		qs,
		body,
		uri: uri || `https://${credentials.subdomain}.service-now.com/api${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (options.qs.limit) {
		delete options.qs.limit;
	}

	try {
		const credentialType =
			authenticationMethod === 'oAuth2' ? 'serviceNowOAuth2Api' : 'serviceNowBasicApi';
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function serviceNowRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];
	let responseData;

	const page = 100;

	query.sysparm_limit = page;

	responseData = await serviceNowApiRequest.call(this, method, resource, body, query, undefined, {
		resolveWithFullResponse: true,
	});
	returnData.push.apply(returnData, responseData.body.result);

	const quantity = responseData.headers['x-total-count'];
	const iterations = Math.round(quantity / page) + (quantity % page ? 1 : 0);

	for (let iteration = 1; iteration < iterations; iteration++) {
		query.sysparm_limit = page;
		query.sysparm_offset = iteration * page;
		responseData = await serviceNowApiRequest.call(this, method, resource, body, query, undefined, {
			resolveWithFullResponse: true,
		});

		returnData.push.apply(returnData, responseData.body.result);
	}

	return returnData;
}

export async function serviceNowDownloadAttachment(
	this: IExecuteFunctions,
	endpoint: string,
	fileName: string,
	contentType: string,
) {
	const fileData = await serviceNowApiRequest.call(this, 'GET', `${endpoint}/file`, {}, {}, '', {
		json: false,
		encoding: null,
		resolveWithFullResponse: true,
	});
	const binaryData = await this.helpers.prepareBinaryData(
		Buffer.from(fileData.body as string),
		fileName,
		contentType,
	);

	return binaryData;
}

export const mapEndpoint = (resource: string, _operation: string) => {
	const resourceEndpoint = new Map([
		['attachment', 'sys_dictionary'],
		['tableRecord', 'sys_dictionary'],
		['businessService', 'cmdb_ci_service'],
		['configurationItems', 'cmdb_ci'],
		['department', 'cmn_department'],
		['dictionary', 'sys_dictionary'],
		['incident', 'incident'],
		['user', 'sys_user'],
		['userGroup', 'sys_user_group'],
		['userRole', 'sys_user_role'],
	]);
	return resourceEndpoint.get(resource);
};

export const sortData = (returnData: INodePropertyOptions[]): INodePropertyOptions[] => {
	returnData.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});
	return returnData;
};
