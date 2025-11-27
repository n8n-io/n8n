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
 * UI params for the MindeeV2 node.
 */
interface MindeeV2UIParams {
	modelId: string;
	rag: string;
	polygon: string;
	confidence: string;
	rawText: string;
	pollingTimeoutCount: number;
	binaryPropertyName?: string;
}

/**
 * Makes an authenticated HTTP request to the Mindee API
 * @param method - HTTP method.
 * @param url - The Mindee API's (complete) URL.
 * @param body - The request body data.
 * @param qs - The query string param.
 * @param headers - Additional request headers (default: empty object)
 * @param option - Additional request options (default: empty object)
 * @returns The API response data
 * @throws NodeApiError when the API request fails
 */
export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	url: string,
	body: IDataObject | FormData = {},
	qs: IDataObject = {},
	headers = {} as IDataObject,
	option = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers,
		method,
		url,
		body,
		qs,
	};
	try {
		options.qs = qs;
		options.body = body;
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
 * Checks response and extracts the polling URL.
 * @param funcRef The execution function reference.
 * @param serverResponse The server response.
 * @throws NodeApiError when the job id is not found in the response.
 */
export function extractPollingUrl(funcRef: IExecuteFunctions, serverResponse: IDataObject): string {
	const pollingUrl = (serverResponse?.job as { polling_url?: string })?.polling_url;
	if (!pollingUrl || pollingUrl.length === 0) {
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: 'Mindee POST response does not contain a valid polling URL.',
		});
	}
	return pollingUrl;
}

/**
 * Polls the Mindee API for the result of a job.
 * Automatically follows the redirect on the last poll attempt.
 * @param funcRef The execution function reference.
 * @param pollUrl URL for the polling.
 * @param pollingTimeoutCounter Maximum number of attempts to poll the API.
 */
export async function pollMindee(
	funcRef: IExecuteFunctions,
	pollUrl: string,
	pollingTimeoutCounter: number,
): Promise<IDataObject[]> {
	const result: IDataObject[] = [];
	await setTimeout(INITIAL_DELAY_MS);
	let serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollUrl);
	if ('inference' in serverResponse) {
		return [serverResponse as IDataObject];
	}
	if (!('job' in serverResponse)) {
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
	}
	let jobStatus: string = (serverResponse.job as IDataObject).status as string;

	for (let i = 0; i < pollingTimeoutCounter; i++) {
		if (
			serverResponse.status ||
			serverResponse.detail ||
			(serverResponse?.job as IDataObject).error ||
			jobStatus === 'Failed'
		) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
		}

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
			message: `Server polling timed out after ${pollingTimeoutCounter} seconds. Status: ${jobStatus}.`,
		});
	result.push(serverResponse);
	return result;
}

/**
 * Reads UI params from a given context.
 * @param ctx Execution context.
 * @param index Index of the parameter.
 */
export function readUIParams(ctx: IExecuteFunctions, index: number): MindeeV2UIParams {
	const rawModel = ctx.getNodeParameter('modelId', index, '') as string | { value?: string };
	const modelId =
		typeof rawModel === 'string'
			? rawModel
			: typeof rawModel?.value === 'string'
				? rawModel.value
				: '';
	const pollingTimeoutCount = ctx.getNodeParameter('pollingTimeoutCount', index, 120) as number;
	const binaryPropertyName = ctx.getNodeParameter('binaryPropertyName', index, '');
	const options = ctx.getNodeParameter('options', index, {});

	const rag = (options.rag as string) ?? 'default';
	const polygon = (options.polygon as string) ?? 'default';
	const confidence = (options.confidence as string) ?? 'default';
	const rawText = (options.rawText as string) ?? 'default';
	return {
		modelId,
		rag,
		polygon,
		confidence,
		rawText,
		pollingTimeoutCount,
		binaryPropertyName,
	};
}

/**
 * Builds the request body for the Mindee API.
 * @param ctx Execution context.
 * @param index Index of the parameter.
 * @param uiParams UI parameters.
 * @param form Form object.
 */
export async function buildRequestBody(
	ctx: IExecuteFunctions,
	index: number,
	uiParams: MindeeV2UIParams,
	form: FormData,
) {
	const name = uiParams.binaryPropertyName;
	if (name) {
		const bin = ctx.helpers.assertBinaryData(index, name);
		const buf = await ctx.helpers.getBinaryDataBuffer(index, name);
		form.append('file', buf, { filename: bin.fileName });
	}

	form.append('model_id', uiParams.modelId);
	if (uiParams.rag !== 'default') form.append('rag', uiParams.rag);
	if (uiParams.polygon !== 'default') form.append('polygon', uiParams.polygon);
	if (uiParams.confidence !== 'default') form.append('confidence', uiParams.confidence);
	if (uiParams.rawText !== 'default') form.append('raw_text', uiParams.rawText);
}
