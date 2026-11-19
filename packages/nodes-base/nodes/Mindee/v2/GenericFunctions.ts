import { sleep } from '@n8n/utils/sleep';
import type FormData from 'form-data';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestUrl } from 'n8n-workflow';

export const ROOT_URL = 'https://api-v2.mindee.net/v2';
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
	documentSource: 'binary' | 'url';
	binaryPropertyName?: string;
	documentUrl?: string;
}

/**
 * Checks if a provided response is a valid node.
 * @param value
 */
function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Makes an authenticated HTTP request to the Mindee API
 * @param method - HTTP method.
 * @param url - The Mindee API's (complete) URL.
 * @param body - The request body data.
 * @param qs - The query string param.
 * @param headers - Additional request headers (default: empty object)
 * @returns The API response data
 * @throws NodeApiError when the API request fails
 */
export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	url: RequestUrl,
	body: IDataObject | FormData = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
): Promise<IDataObject> {
	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			...headers,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'User-Agent': `mindee-api-n8n@v${this.getNode().typeVersion ?? 'unknown'}`,
		},
		method,
		url,
		body,
		qs,
	};

	let response: unknown;
	try {
		response = await this.helpers.httpRequestWithAuthentication.call(this, 'mindeeApi', {
			...options,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	if (!isDataObject(response)) {
		throw new NodeApiError(this.getNode(), {} as JsonObject, {
			message: 'Mindee API returned a non-object response',
		});
	}

	return response;
}

/**
 * Checks response and extracts the polling URL.
 * @param funcRef The execution function reference.
 * @param serverResponse The server response.
 * @throws NodeApiError when the job id is not found in the response.
 */
export function extractPollingUrl(
	funcRef: IExecuteFunctions,
	serverResponse: IDataObject,
): RequestUrl {
	const pollingUrl = (serverResponse?.job as { polling_url?: string })?.polling_url;
	if (!pollingUrl || !pollingUrl.startsWith(`${ROOT_URL}/`)) {
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: 'Mindee POST response does not contain a valid polling URL.',
		});
	}
	return requestUrl`${pollingUrl}`;
}

/**
 * Polls the Mindee API until the job returns its inference result.
 * Once the job is done, the API redirects the poll request to the result.
 * The HTTP client follows that redirect.
 * @param funcRef The execution function reference.
 * @param pollUrl URL for the polling.
 * @param maxPolls Maximum number of polls after the first one.
 */
export async function pollMindee(
	funcRef: IExecuteFunctions,
	pollUrl: RequestUrl,
	maxPolls: number,
): Promise<IDataObject[]> {
	await sleep(INITIAL_DELAY_MS);
	let serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollUrl);

	for (let polls = 0; ; polls++) {
		if ('inference' in serverResponse) return [serverResponse];

		const job = serverResponse.job;
		if (serverResponse.status || serverResponse.detail || (isDataObject(job) && job.error)) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
		}
		if (!isDataObject(job)) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
				message: 'The Mindee API replied with an unexpected reply.',
			});
		}
		if (job.status === 'Failed') {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
		}
		if (polls >= maxPolls) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
				message: `Server polling timed out after ${maxPolls} seconds. Status: ${String(job.status)}.`,
			});
		}

		await sleep(POLL_DELAY_MS);
		serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollUrl);
	}
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
	const options = ctx.getNodeParameter('options', index, {});
	const pollingTimeoutCount =
		typeof options.pollingTimeoutCount === 'number' ? options.pollingTimeoutCount : 180;
	const documentSource = ctx.getNodeParameter('documentSource', index, 'binary') as
		| 'binary'
		| 'url';
	const binaryPropertyName =
		documentSource === 'binary' ? ctx.getNodeParameter('binaryPropertyName', index, '') : undefined;
	const documentUrl =
		documentSource === 'url'
			? (ctx.getNodeParameter('documentUrl', index, '') as string)
			: undefined;

	const rag = typeof options.rag === 'string' ? options.rag : 'default';
	const polygon = typeof options.polygon === 'string' ? options.polygon : 'default';
	const confidence = typeof options.confidence === 'string' ? options.confidence : 'default';
	const rawText = typeof options.rawText === 'string' ? options.rawText : 'default';
	return {
		modelId,
		rag,
		polygon,
		confidence,
		rawText,
		pollingTimeoutCount,
		documentSource,
		binaryPropertyName,
		documentUrl,
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
	if (uiParams.documentSource === 'url') {
		if (!uiParams.documentUrl) {
			throw new NodeOperationError(ctx.getNode(), 'A document URL is required', {
				itemIndex: index,
			});
		}
		form.append('url', uiParams.documentUrl);
	} else {
		const name = uiParams.binaryPropertyName;
		if (!name) {
			throw new NodeOperationError(ctx.getNode(), 'An input data field name is required', {
				itemIndex: index,
			});
		}
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
