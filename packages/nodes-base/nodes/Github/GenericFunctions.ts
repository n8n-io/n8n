import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { deepCopy, NodeApiError, NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

import { pullRequestCache } from './pull-request-cache';

/**
 * Make an API request to Github
 *
 */
export async function githubApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	query?: IDataObject,
	option: Pick<IRequestOptions, 'headers' | 'json' | 'resolveWithFullResponse'> = {},
): Promise<any> {
	try {
		const authenticationMethod = this.getNodeParameter(
			'authentication',
			0,
			'accessToken',
		) as string;
		let credentialType = '';

		if (authenticationMethod === 'accessToken') {
			credentialType = 'githubApi';
		} else if (authenticationMethod === 'githubAppApi') {
			credentialType = 'githubAppApi';
		} else {
			credentialType = 'githubOAuth2Api';
		}

		const credentials = await this.getCredentials(credentialType);
		const baseUrl = credentials.server || 'https://api.github.com';
		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			method,
			body,
			qs: query,
			uri: requestUrl`${baseUrl}${endpoint}`,
			json: true,
		};

		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}

		const credentialId =
			method === 'GET' &&
			options.json !== false &&
			/^\/repos\/[^/]+\/[^/]+\/pulls(?:\/\d+)?$/.test(String(endpoint))
				? this.getNode().credentials?.[credentialType]?.id
				: undefined;
		if (credentialId) {
			const key = JSON.stringify([
				credentialType,
				credentialId,
				options.uri.value,
				query,
				options.headers,
			]);
			const cached = pullRequestCache.get(key);
			if (cached) {
				options.headers = { ...options.headers, 'If-None-Match': cached.etag };
			}

			let response: { statusCode: number; headers: IDataObject; body: IDataObject | IDataObject[] };
			try {
				// Keep the data-fetched hook, but refresh credentials only after a 401.
				response = await this.helpers.requestWithAuthentication.call(
					this,
					credentialType,
					{ ...options, resolveWithFullResponse: true },
					{ preAuthenticationRetryStatusCode: 401 },
				);
			} catch (error) {
				// The request helper can report 304 as a NodeApiError.
				if (!cached || (error.statusCode !== 304 && error.httpCode !== '304')) {
					throw error;
				}
				return deepCopy(
					option.resolveWithFullResponse
						? { statusCode: 200, headers: cached.headers, body: cached.body }
						: cached.body,
				);
			}

			if (response.statusCode === 304 && cached) {
				return deepCopy(
					option.resolveWithFullResponse
						? { ...response, headers: cached.headers, body: cached.body }
						: cached.body,
				);
			}

			if (response.statusCode === 200 && typeof response.headers.etag === 'string') {
				pullRequestCache.set(key, {
					etag: response.headers.etag,
					headers: deepCopy(response.headers),
					body: deepCopy(response.body),
				});
			} else {
				pullRequestCache.delete(key);
			}
			return option.resolveWithFullResponse ? response : response.body;
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

	const getEndpoint = filePath
		.split('/')
		.filter(Boolean)
		.reduce(
			(path, segment) => requestPath`${path}/${segment}`,
			requestPath`/repos/${owner}/${repository}/contents`,
		);
	const responseData = await githubApiRequest.call(this, 'GET', getEndpoint, {}, query);

	if (responseData.sha === undefined) {
		throw new NodeOperationError(this.getNode(), 'Could not get the SHA of the file.');
	}
	return responseData.sha;
}

export async function githubApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

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
 * Validates a secret name against GitHub's naming rules, so an invalid name fails
 * before the public key lookup and encryption rather than as an opaque API error.
 * https://docs.github.com/en/actions/reference/workflows-and-actions/variables
 *
 * @param secretName - The secret name to validate
 * @returns An error message, or undefined when the name is valid
 */
export function validateSecretName(secretName: string): string | undefined {
	if (!secretName) {
		return 'Secret name is required.';
	}

	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(secretName)) {
		return `Secret name "${secretName}" is invalid. Names may only contain alphanumeric characters and underscores, and must not start with a number.`;
	}

	if (/^GITHUB_/i.test(secretName)) {
		return `Secret name "${secretName}" is invalid. Names must not start with the "GITHUB_" prefix.`;
	}

	return undefined;
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
	// js-nacl is an Emscripten build with a large per-instance heap, so it is only
	// pulled in on this path rather than by every node that imports this module.
	const { default: nacl_factory } = await import('js-nacl');

	// `instantiate` resolves to the same instance it passes to the callback, so awaiting it
	// surfaces initialisation failures as a rejection instead of never invoking the callback.
	// The callback is still required: js-nacl throws if it is not a function.
	const nacl = await nacl_factory.instantiate(() => {});

	const secretBytes = nacl.encode_utf8(secretValue);
	const keyBytes = new Uint8Array(Buffer.from(publicKey, 'base64'));
	const encryptedBytes = nacl.crypto_box_seal(secretBytes, keyBytes);

	return Buffer.from(encryptedBytes).toString('base64');
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
	const endpoint = requestPath`/repos/${owner}/${repository}/actions/secrets/public-key`;
	const responseData = await githubApiRequest.call(this, 'GET', endpoint, {});

	if (!responseData.key_id || !responseData.key) {
		throw new NodeOperationError(this.getNode(), 'Could not retrieve repository public key.');
	}

	return {
		key_id: responseData.key_id,
		key: responseData.key,
	};
}
