import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import get from 'lodash/get';

import { query } from './Queries';

export async function linearApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,

	body: any = {},
	option: IDataObject = {},
): Promise<any> {
	const endpoint = 'https://api.linear.app/graphql';
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'apiToken') as string;

	let options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body,
		uri: endpoint,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.requestWithAuthentication.call(
			this,
			authenticationMethod === 'apiToken' ? 'linearApi' : 'linearOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function capitalizeFirstLetter(data: string) {
	return data.charAt(0).toUpperCase() + data.slice(1);
}

export async function linearApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	body: any = {},
	limit?: number,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	body.variables.first = limit && limit < 50 ? limit : 50;
	body.variables.after = null;

	const propertyPath = propertyName.split('.');
	const nodesPath = [...propertyPath, 'nodes'];
	const endCursorPath = [...propertyPath, 'pageInfo', 'endCursor'];
	const hasNextPagePath = [...propertyPath, 'pageInfo', 'hasNextPage'];

	do {
		responseData = await linearApiRequest.call(this, body);
		const nodes = get(responseData, nodesPath) as IDataObject[];
		returnData.push(...nodes);
		body.variables.after = get(responseData, endCursorPath);
		if (limit && returnData.length >= limit) {
			return returnData;
		}
	} while (get(responseData, hasNextPagePath));

	return returnData;
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: credentials.apiKey,
		},
		method: 'POST',
		body: {
			query: query.getIssues(),
			variables: {
				first: 1,
			},
		},
		uri: 'https://api.linear.app/graphql',
		json: true,
	};

	return await this.helpers.request(options);
}

//@ts-ignore
export const sort = (a, b) => {
	if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
		return -1;
	}
	if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
		return 1;
	}
	return 0;
};
