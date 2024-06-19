import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

import type { SplunkCredentials, SplunkError } from '../types';
import { extractErrorDescription, parseXml } from '../helpers/utils';

export async function splunkApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const { baseUrl, allowUnauthorizedCerts } = (await this.getCredentials(
		'splunkApi',
	)) as SplunkCredentials;

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		rejectUnauthorized: !allowUnauthorizedCerts,
		useQuerystring: true, // serialize roles array as `roles=A&roles=B`
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	let result;
	try {
		let attempts = 0;

		do {
			try {
				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'splunkApi',
					options,
				);
				result = await parseXml(response);
				return result;
			} catch (error) {
				if (attempts >= 5) {
					throw error;
				}
				await sleep(1000);
				attempts++;
			}
		} while (true);
	} catch (error) {
		if (result === undefined) {
			throw new NodeOperationError(this.getNode(), 'No response from API call', {
				description: "Try to use 'Retry On Fail' option from node's settings",
			});
		}
		if (error?.cause?.code === 'ECONNREFUSED') {
			throw new NodeApiError(this.getNode(), { ...(error as JsonObject), code: 401 });
		}

		const rawError = (await parseXml(error.error as string)) as SplunkError;
		error = extractErrorDescription(rawError);

		if ('fatal' in error) {
			error = { error: error.fatal };
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
