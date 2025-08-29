import type FormData from 'form-data';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { setTimeout } from 'node:timers/promises';

const INITIAL_DELAY_MS = 1500;
const POLL_DELAY_MS = 1000;

/**
 * Makes an authenticated HTTP request to the Mindee API
 * @param method - HTTP method.
 * @param url - The Mindee API's (complete) URL.
 * @param body - The request body data.
 * @param option - Additional request options (default: empty object)
 * @returns The API response data
 * @throws NodeApiError when the API request fails
 */
export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	url: string,
	body: IDataObject | FormData = {},
	option = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {},
		method,
		url,
		body,
	};
	try {
		delete options.qs;
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		return await this.helpers.httpRequestWithAuthentication.call(this, 'mindeeV2Api', {
			...options,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Polls the Mindee API for the result of a job.
 * Automatically follows the redirect on the last poll attempt.
 * @param funcRef The execution function reference.
 * @param initialResponse Initial POST request response from the API.
 * @param maxDelayCounter Maximum number of attempts to poll the API.
 */
export async function pollMindee(
	funcRef: IExecuteFunctions,
	initialResponse: IDataObject,
	maxDelayCounter: number,
): Promise<IDataObject[]> {
	const result: IDataObject[] = [];
	let serverResponse = initialResponse;
	const jobId: string | undefined = (serverResponse?.job as IDataObject)?.id as string;
	if (!jobId || jobId.length === 0) {
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: 'Mindee POST response does not contain a job id.',
		});
	}
	let jobStatus: string = (serverResponse.job as IDataObject).status as string;
	const pollUrl = (serverResponse.job as IDataObject).polling_url as string;

	await setTimeout(INITIAL_DELAY_MS);

	for (let i = 0; i < maxDelayCounter; i++) {
		if (
			serverResponse.error ||
			(serverResponse?.job as IDataObject).error ||
			jobStatus === 'Failed'
		) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollUrl);
		if ('inference' in (serverResponse as JsonObject)) break;

		if (!('job' in serverResponse))
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
				message: 'The Mindee API replied with an unexpected reply.',
			});
		jobStatus = (serverResponse.job as IDataObject).status as string;
		await setTimeout(POLL_DELAY_MS);
	}

	if (!('inference' in (serverResponse as JsonObject)))
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: `Server polling timed out after ${maxDelayCounter} seconds. Status: ${jobStatus}.`,
		});
	result.push(serverResponse);
	return result;
}
