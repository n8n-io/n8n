import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { NodeOperationError, type INode } from 'n8n-workflow';

/**
 * Make an API request to Supadata
 */
export async function supadataApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('supadataApi');

	if (!credentials?.apiKey) {
		throw new NodeApiError(this.getNode(), {
			message: 'No API key found in credentials',
		});
	}

	const options: IHttpRequestOptions = {
		method,
		headers: {
			'x-api-key': credentials.apiKey as string,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		qs: query,
		url: `https://api.supadata.ai/v1${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Fetch all items from a paginated Supadata API endpoint
 */
export async function supadataApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		// Make the API request
		responseData = await supadataApiRequest.call(this, method, endpoint, body, query);

		console.log('responseData in apiallitems:', responseData);

		if (responseData[propertyName]) {
			returnData.push(...responseData[propertyName]);
		}

		uri = responseData.next;
		query = {};
	} while (responseData.next);

	return returnData;
}

// Helper function to extract video ID from YouTube URL
export const extractVideoIdFromUrl = (url: string, node: INode): string => {
	const regex =
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const match = url.match(regex);

	if (!match) {
		throw new NodeOperationError(node, 'Invalid YouTube Video URL. Unable to extract video ID.');
	}

	return match[1];
};

// Helper function to extract channel ID from YouTube URL
export const extractChannelIdFromUrl = (url: string, node: INode): string => {
	const regex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel\/|c\/|@)([a-zA-Z0-9_-]+)/;
	const match = url.match(regex);

	if (!match) {
		throw new NodeOperationError(
			node,
			'Invalid YouTube Channel URL. Unable to extract channel ID.',
		);
	}

	return match[1];
};
