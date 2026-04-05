import * as nacl_factory from 'js-nacl';
import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * Make an API request to Github
 *
 */
export async function githubApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	option: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		const authenticationMethod = this.getNodeParameter(
			'authentication',
			0,
			'accessToken',
		) as string;
		let credentialType = '';

		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('githubApi');
			credentialType = 'githubApi';

			const baseUrl = credentials.server || 'https://api.github.com';
			options.uri = `${baseUrl}${endpoint}`;
		} else {
			const credentials = await this.getCredentials('githubOAuth2Api');
			credentialType = 'githubOAuth2Api';

			const baseUrl = credentials.server || 'https://api.github.com';
			options.uri = `${baseUrl}${endpoint}`;
		}

		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Returns the SHA of the given file
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function getFileSha(
	this: IHookFunctions | IExecuteFunctions,
	owner: string,
	repository: string,
	filePath: string,
	branch?: string,
): Promise<any> {
	const query: IDataObject = {};
	if (branch !== undefined) {
		query.ref = branch;
	}

	const getEndpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
	const responseData = await githubApiRequest.call(this, 'GET', getEndpoint, {}, query);

	if (responseData.sha === undefined) {
		throw new NodeOperationError(this.getNode(), 'Could not get the SHA of the file.');
	}
	return responseData.sha;
}

export async function githubApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await githubApiRequest.call(this, method, endpoint, body as IDataObject, query, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (responseData.headers.link?.includes('next'));
	return returnData;
}

export function isBase64(content: string) {
	const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	return base64regex.test(content);
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

/**
 * Encrypts a secret value using the repository's public key
 * GitHub requires secrets to be encrypted using libsodium sealed box
 *
 * @param secretValue - The plaintext secret value to encrypt
 * @param publicKey - The base64-encoded public key from the repository
 * @returns The base64-encoded encrypted secret
 */
export async function encryptSecret(secretValue: string, publicKey: string): Promise<string> {
	return await new Promise((resolve, reject) => {
		nacl_factory.instantiate((nacl: ReturnType<typeof nacl_factory.instantiate>) => {
			try {
				const secretBytes: Uint8Array = nacl.encode_utf8(secretValue);
				const keyBytes = Buffer.from(publicKey, 'base64');
				const encryptedBytes: Uint8Array = nacl.crypto_box_seal(secretBytes, keyBytes);
				const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64');
				resolve(encryptedBase64);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Fetches the repository's public key for encrypting secrets
 *
 * @param owner - Repository owner
 * @param repository - Repository name
 * @returns Object containing the key_id and key (public key)
 */
export async function getRepositoryPublicKey(
	this: IHookFunctions | IExecuteFunctions,
	owner: string,
	repository: string,
): Promise<{ key_id: string; key: string }> {
	const endpoint = `/repos/${owner}/${repository}/actions/secrets/public-key`;
	const responseData = await githubApiRequest.call(this, 'GET', endpoint, {});

	if (!responseData.key_id || !responseData.key) {
		throw new NodeOperationError(this.getNode(), 'Could not retrieve repository public key.');
	}

	return {
		key_id: responseData.key_id,
		key: responseData.key,
	};
}
