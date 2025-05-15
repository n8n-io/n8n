import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Readable } from 'stream';

export const UPLOAD_CHUNK_SIZE = 1024 * 1024;

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	let options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${resource}`,
		json: true,
	};
	try {
		options = Object.assign({}, options, option);

		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(this, 'youTubeOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

async function* bufferToChunks(buffer: Buffer) {
	for (let j = 0; j < buffer.length; j += UPLOAD_CHUNK_SIZE) {
		yield Buffer.from(buffer.subarray(j, j + UPLOAD_CHUNK_SIZE));
	}
}

export function getChunkedFileContent(
	content: Buffer | Readable,
	binaryDataId: string | undefined,
) {
	if (binaryDataId) return content;
	if (!Buffer.isBuffer(content)) return content;
	return bufferToChunks(content);
}
