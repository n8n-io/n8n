import get from 'lodash/get';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function venafiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const operation = this.getNodeParameter('operation', 0);
	const credentials = await this.getCredentials('venafiTlsProtectCloudApi');

	const region = credentials.region ?? 'cloud';

	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'content-type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `https://api.venafi.${region}${resource}`,
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	// For cert download we don't need any headers
	// If we remove for everything the key fetch fails
	if (operation === 'download') {
		// We need content-type for keystore
		if (!resource.endsWith('keystore')) {
			delete options.headers!.Accept;
			delete options.headers!['content-type'];
		}
	}

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(
			this,
			'venafiTlsProtectCloudApi',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function venafiApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await venafiApiRequest.call(this, method, endpoint, body, query);
		endpoint = get(responseData, '_links[0].Next');
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData._links?.[0].Next);

	return returnData;
}

export async function encryptPassphrase(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	certificateId: string,
	passphrase: string,
	storePassphrase: string,
) {
	let dekHash = '';
	const dekResponse = await venafiApiRequest.call(
		this,
		'GET',
		`/outagedetection/v1/certificates/${certificateId}`,
	);

	if (dekResponse.dekHash) {
		dekHash = dekResponse.dekHash;
	}

	let pubKey = '';
	const pubKeyResponse = await venafiApiRequest.call(
		this,
		'GET',
		`/v1/edgeencryptionkeys/${dekHash}`,
	);

	if (pubKeyResponse.key) {
		pubKey = pubKeyResponse.key;
	}

	// js-nacl is an Emscripten build with a large per-instance heap, so it is only
	// pulled in on this path rather than by every node that imports this module.
	const nacl_factory = await import('js-nacl');

	// `instantiate` resolves to the same instance it passes to the callback, so awaiting it
	// surfaces initialisation failures as a rejection instead of never invoking the callback.
	// The callback is still required: js-nacl throws if it is not a function.
	const nacl = await nacl_factory.instantiate(() => {});

	const keyBytes = new Uint8Array(Buffer.from(pubKey, 'base64'));
	const encryptedKeyPass = Buffer.from(
		nacl.crypto_box_seal(nacl.encode_utf8(passphrase), keyBytes),
	).toString('base64');
	const encryptedKeyStorePass = Buffer.from(
		nacl.crypto_box_seal(nacl.encode_utf8(storePassphrase), keyBytes),
	).toString('base64');

	return [encryptedKeyPass, encryptedKeyStorePass];
}
