import {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

import { createHash } from 'crypto';

type OnOfficeAction = 'get' | 'read';
type OnOfficeResource = 'estates' | 'address';

const MD5 = (str: string) => {
	return createHash('md5').update(str).digest('hex');
};

export const onOfficeApiAction = async (
	that: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	actionType: OnOfficeAction,
	resourceType: OnOfficeResource,
	parameters: Record<string, unknown>,
	resourceid = '',
) => {
	const credentials = (await that.getCredentials('onOfficeApi')) as ICredentialDataDecryptedObject;

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

	try {
		const response = await that.helpers.request?.(options);
		return response;
	} catch (error) {
		throw new NodeApiError(that.getNode(), error as JsonObject);
	}
};
