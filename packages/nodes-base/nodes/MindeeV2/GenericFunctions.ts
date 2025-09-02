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
	alias?: string;
	rag: boolean;
	polygon: boolean;
	confidence: boolean;
	rawText: boolean;
	maxDelayCount: number;
	binaryPropertyName?: string;
}

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
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {
			'User-Agent': `mindee-n8n@v${this.getNode().typeVersion ?? 'unknown'}`,
		},
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

/**
 * Reads UI params from a given context.
 * @param ctx Execution context.
 * @param index Index of the parameter.
 */
export function readUIParams(ctx: IExecuteFunctions, index: number): MindeeV2UIParams {
	return {
		modelId: ctx.getNodeParameter('modelId', index) as string,
		alias: ctx.getNodeParameter('alias', index) as string,
		rag: ctx.getNodeParameter('rag', index) as boolean,
		polygon: ctx.getNodeParameter('polygon', index) as boolean,
		confidence: ctx.getNodeParameter('confidence', index) as boolean,
		rawText: ctx.getNodeParameter('rawText', index) as boolean,
		maxDelayCount: ctx.getNodeParameter('maxDelayCount', index) as number,
		binaryPropertyName: ctx.getNodeParameter('binaryPropertyName', index, ''),
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
	const name = uiParams.binaryPropertyName!;
	const bin = ctx.helpers.assertBinaryData(index, name);
	const buf = await ctx.helpers.getBinaryDataBuffer(index, name);
	form.append('file', buf, { filename: bin.fileName });

	form.append('model_id', uiParams.modelId);
	if (uiParams.alias) {
		form.append('alias', uiParams.alias);
	}
	form.append('rag', uiParams.rag ? 'true' : 'false');
	form.append('polygon', uiParams.polygon ? 'true' : 'false');
	form.append('confidence', uiParams.confidence ? 'true' : 'false');
	form.append('raw_text', uiParams.rawText ? 'true' : 'false');
}
