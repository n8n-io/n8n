import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import get from 'lodash.get';

import * as nacl_factory from 'js-nacl';

export async function venafiApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	resource: string,
	body = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const operation = this.getNodeParameter('operation', 0);

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'content-type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `https://api.venafi.cloud${resource}`,
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
	method: string,
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

	let encryptedKeyPass = '';
	let encryptedKeyStorePass = '';

	const promise = async () => {
		return new Promise((resolve, reject) => {
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
	return promise();
}
