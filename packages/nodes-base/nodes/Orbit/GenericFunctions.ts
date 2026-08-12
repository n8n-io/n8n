import type {
	JsonObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { IRelation } from './Interfaces';

export async function orbitApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('orbitApi');
		let options: IRequestOptions = {
			headers: {
				Authorization: `Bearer ${credentials.accessToken}`,
			},
			method,
			qs,
			body,
			uri: uri || `https://app.orbit.love/api/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function resolveIdentities(responseData: IRelation) {
	const identities: IDataObject = {};
	for (const data of responseData.included) {
		identities[data.id as string] = data;
	}

	if (!Array.isArray(responseData.data)) {
		responseData.data = [responseData.data];
	}

	for (let i = 0; i < responseData.data.length; i++) {
		for (let y = 0; y < responseData.data[i].relationships.identities.data.length; y++) {
			//@ts-ignore
			responseData.data[i].relationships.identities.data[y] =
				identities[responseData.data[i].relationships.identities.data[y].id];
		}
	}
}

export function resolveMember(responseData: IRelation) {
	const members: IDataObject = {};
	for (const data of responseData.included) {
		members[data.id as string] = data;
	}

	if (!Array.isArray(responseData.data)) {
		responseData.data = [responseData.data];
	}

	for (let i = 0; i < responseData.data.length; i++) {
		//@ts-ignore
		responseData.data[i].relationships.member.data =
			//@ts-ignore
			members[responseData.data[i].relationships.member.data.id];
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function orbitApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await orbitApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);

		if (query.resolveIdentities === true) {
			resolveIdentities(responseData as IRelation);
		}

		if (query.resolveMember === true) {
			resolveMember(responseData as IRelation);
		}

		query.page++;
		const limit = query.limit as number | undefined;
		if (limit && returnData.length >= limit) {
			return returnData;
		}
	} while (responseData.data.length !== 0);
	return returnData;
}
