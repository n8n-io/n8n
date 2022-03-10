import {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

import { createHash } from 'crypto';

type OnOfficeAction = 'get' | 'read';
type OnOfficeActionId = `urn:onoffice-de-ns:smart:2.5:smartml:action:${'get' | 'read'}`;
type OnOfficeResource = 'estates' | 'address';

interface OnOfficeResponseRecord {
	id: string;
	type: OnOfficeResource;
	elements: Record<string, unknown> | Array<Record<string, unknown>>;
}

interface OnOfficeActionResponseBase {
	actionId: OnOfficeActionId;
	resourceId: string;
	resourceType: OnOfficeResource;
	cachable: boolean;
	identifier: string;
}

interface OnOfficeActionResponseError extends OnOfficeActionResponseBase {
	cachable: false;
	data: never[];
	status: ErrorStatus;
}

interface OnOfficeActionResponseSuccess extends OnOfficeActionResponseBase {
	data: {
		meta: Record<string, unknown>;
		records: OnOfficeResponseRecord[];
	};
	status: SuccessStatus;
}

type OnOfficeActionResponse = OnOfficeActionResponseError | OnOfficeActionResponseSuccess;

interface ErrorStatus {
	errorcode: number;
	message?: string;
}

interface SuccessStatus {
	errorcode: 0;
	message?: string;
}

interface OnOfficeResponseSuccess {
	status: { code: 200 } & SuccessStatus;
	response: { results: OnOfficeActionResponseSuccess[] };
}
interface OnOfficeResponseNoAuth {
	status: { code: 400 | 401 } & ErrorStatus;
	response: { results: OnOfficeActionResponseError[] };
}
interface OnOfficeResponseError {
	status: { code: 500 } & ErrorStatus;
	response: { results: OnOfficeActionResponse[] };
}

type OnOfficeResponse = OnOfficeResponseSuccess | OnOfficeResponseNoAuth | OnOfficeResponseError;

const MD5 = (str: string) => {
	return createHash('md5').update(str).digest('hex');
};

const assertSuccessfulResponse: (
	responseData: OnOfficeResponse,
	node: INode,
) => asserts responseData is OnOfficeResponseSuccess = (responseData, node) => {
	if (responseData.status.code !== 200) {
		throw new NodeApiError(node, responseData as unknown as JsonObject, {
			httpCode: responseData.status.code === 400 ? '401' : responseData.status.code + '',
			description: responseData.status.message + ' ',
			message:
				responseData.status.code === 400
					? 'Authorization failed - please check your credentials'
					: responseData.status.code === 500
					? 'The service failed to process your request'
					: 'Your request is invalid or could not be processed by the service',
		});
	}
};

export async function onOfficeApiAction(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	actionType: OnOfficeAction,
	resourceType: OnOfficeResource,
	parameters: Record<string, unknown>,
	resourceid = '',
) {
	const credentials = (await this.getCredentials('onOfficeApi')) as ICredentialDataDecryptedObject;

	const apiSecret = credentials.apiSecret as string;
	const apiToken = credentials.apiToken as string;
	const identifier = '';
	const resourcetype = resourceType;
	const timestamp = Math.floor(Date.now() / 1000) + '';
	const actionid = `urn:onoffice-de-ns:smart:2.5:smartml:action:${actionType}`;

	const hmac = MD5(
		apiSecret +
			MD5(
				`${JSON.stringify(
					parameters,
				)},${apiToken},${actionid},${identifier},${resourceid},${apiSecret},${timestamp},${resourceType}`,
			),
	);

	const action = {
		actionid,
		identifier,
		resourcetype,
		resourceid,
		parameters,
		timestamp,
		hmac,
	};

	const body = {
		token: apiToken,
		request: {
			actions: [action],
		},
	};

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-onoffice',
		},
		method: 'POST',
		body,
		uri: 'https://api.onoffice.de/api/latest/api.php',
		json: true,
	};

	const responseData = (await this.helpers.request?.(options).catch((error: JsonObject) => {
		throw new NodeApiError(this.getNode(), error);
	})) as OnOfficeResponse;

	assertSuccessfulResponse(responseData, this.getNode());

	const results = responseData.response.results[0].data.records;
	return results;
}
