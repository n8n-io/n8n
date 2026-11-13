<<<<<<< HEAD
import * as nacl_factory from 'js-nacl';
import get from 'lodash/get';
=======
>>>>>>> 9d82d35cb (chore: Bundle/2.x (#43761))
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

import { parseNextPageLink } from '../parseNextPageLink';

export async function venafiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body = {},
	qs: IDataObject = {},
	option: Pick<IRequestOptions, 'encoding' | 'json' | 'resolveWithFullResponse'> = {},
): Promise<any> {
	const operation = this.getNodeParameter('operation', 0);
	const credentials = await this.getCredentials('venafiTlsProtectCloudApi');

	const region = credentials.region ?? 'cloud';

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			'content-type': 'application/json',
		},
		method,
		body,
		qs,
		uri: requestUrl`https://api.venafi.${region}${resource}`,
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	// For cert download we don't need any headers
	// If we remove for everything the key fetch fails
	if (operation === 'download') {
		// We need content-type for keystore
		if (!resource.value.endsWith('keystore')) {
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
	endpoint: RequestPath,

	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let next: { resource: RequestPath; qs: IDataObject } | undefined = {
		resource: endpoint,
		qs: query,
	};

	do {
		responseData = await venafiApiRequest.call(this, method, next.resource, body, next.qs);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const nextLink: string | undefined = responseData._links?.[0]?.Next;
		next = nextLink ? parseNextPageLink(this, nextLink, next.resource) : undefined;
	} while (next);

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
		requestPath`/outagedetection/v1/certificates/${certificateId}`,
	);

	if (dekResponse.dekHash) {
		dekHash = dekResponse.dekHash;
	}

	let pubKey = '';
	const pubKeyResponse = await venafiApiRequest.call(
		this,
		'GET',
		requestPath`/v1/edgeencryptionkeys/${dekHash}`,
	);

	if (pubKeyResponse.key) {
		pubKey = pubKeyResponse.key;
	}

	let encryptedKeyPass = '';
	let encryptedKeyStorePass = '';

	const promise = async () => {
		return await new Promise((resolve, reject) => {
			nacl_factory.instantiate((nacl: any) => {
				try {
					const passphraseUTF8 = nacl.encode_utf8(passphrase) as string;
					const keyPassBuffer = nacl.crypto_box_seal(passphraseUTF8, Buffer.from(pubKey, 'base64'));
					encryptedKeyPass = Buffer.from(keyPassBuffer as Buffer).toString('base64');

					const storePassphraseUTF8 = nacl.encode_utf8(storePassphrase) as string;
					const keyStorePassBuffer = nacl.crypto_box_seal(
						storePassphraseUTF8,
						Buffer.from(pubKey, 'base64'),
					);
					encryptedKeyStorePass = Buffer.from(keyStorePassBuffer as Buffer).toString('base64');

					return resolve([encryptedKeyPass, encryptedKeyStorePass]);
				} catch (error) {
					return reject(error);
				}
			});
		});
	};
	return await promise();
}
