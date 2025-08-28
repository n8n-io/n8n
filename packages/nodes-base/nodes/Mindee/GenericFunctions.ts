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

export async function mindeeApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	url: string,
	body: any = {},
	qs: IDataObject = {},
	option = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {},
		method,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		body,
		qs,
		url,
		disableFollowRedirect: true,
		ignoreHttpStatusErrors: true,
		json: false,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}

		return await this.helpers.httpRequestWithAuthentication.call(this, 'mindeeV2Api', {
			...options,
			maxRedirects: 0,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

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

		if (jobStatus === 'Processed') break;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollUrl);

		if (serverResponse.error || !('job' in serverResponse))
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
				message: 'Mindee API responded with an error.',
			});
		jobStatus = (serverResponse.job as IDataObject).status as string;
		await setTimeout(POLL_DELAY_MS);
	}

	const inferenceUrl = (serverResponse.job as IDataObject).result_url;
	if (jobStatus !== 'Processed' || inferenceUrl === undefined || inferenceUrl === null)
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: `Server polling timed out after ${maxDelayCounter} seconds. Status: ${jobStatus}.`,
		});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	serverResponse = await mindeeApiRequest.call(funcRef, 'GET', inferenceUrl as string);
	if ((serverResponse?.job as IDataObject)?.error)
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: JSON.stringify(serverResponse as JsonObject),
		});
	result.push(serverResponse);
	return result;
}
