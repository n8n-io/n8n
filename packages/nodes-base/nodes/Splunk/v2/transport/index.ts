import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestUrl } from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';
import type { SplunkCredentials, SplunkError } from '../helpers/interfaces';
import { extractErrorDescription, formatEntry, parseXml } from '../helpers/utils';

export async function splunkApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	{ output_mode: _, ...body }: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const { baseUrl, allowUnauthorizedCerts } =
		await this.getCredentials<SplunkCredentials>('splunkApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs: { ...qs, output_mode: 'xml' },
		uri: requestUrl`${baseUrl}${endpoint}`,
		rejectUnauthorized: !allowUnauthorizedCerts,
		useQuerystring: true, // serialize roles array as `roles=A&roles=B`
	};

	let result;
	try {
		let attempts = 0;

		do {
			try {
				result = await this.helpers.requestWithAuthentication.call(this, 'splunkApi', options);
				break;
			} catch (error) {
				if (attempts >= 5) {
					throw error;
				}
				await sleep(1000);
				attempts++;
			}
		} while (true);
	} catch (error) {
		if (error instanceof NodeApiError) throw error;

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

	try {
		return await parseXml(result);
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			'Splunk returned a response that is not valid XML',
		);
	}
}

export async function splunkApiJsonRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { baseUrl, allowUnauthorizedCerts } =
		await this.getCredentials<SplunkCredentials>('splunkApi');

	qs.output_mode = 'json';

	const options: WithRequestTarget<IHttpRequestOptions> = {
		method,
		body,
		qs: qs ?? {},
		url: requestUrl`${baseUrl}${endpoint}`,
		json: true,
		skipSslCertificateValidation: allowUnauthorizedCerts,
	};

	if (!Object.keys(body).length) delete options.body;

	let result;
	try {
		let attempts = 0;

		do {
			try {
				result = await this.helpers.httpRequestWithAuthentication.call(this, 'splunkApi', options);

				if (result.entry) {
					const { entry } = result;
					return (entry as IDataObject[]).map((e) => formatEntry(e, true));
				}

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
		if (error instanceof NodeApiError) throw error;

		if (result === undefined) {
			throw new NodeOperationError(this.getNode(), 'No response from API call', {
				description: "Try to use 'Retry On Fail' option from node's settings",
			});
		}
		if (error?.cause?.code === 'ECONNREFUSED') {
			throw new NodeApiError(this.getNode(), { ...(error as JsonObject), code: 401 });
		}

		if ('fatal' in error) error = { error: error.fatal };

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
