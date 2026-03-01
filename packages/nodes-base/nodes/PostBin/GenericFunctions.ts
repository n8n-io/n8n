import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// Regular expressions used to extract binId from parameter value
const BIN_ID_REGEX = /\b\d{13}-\d{13}\b/g;

/**
 * Extracts the PostBin Bin Id from the specified string.
 * This method should be able to extract bin Id from the
 * PostBin URL or from the string in the following format:
 * `Bin '<binId>'.`
 *
 */
function parseBinId(context: IExecuteSingleFunctions) {
	const binId = context.getNodeParameter('binId') as string;
	// Test if the Bin id is in the expected format
	BIN_ID_REGEX.lastIndex = 0;
	const idMatch = BIN_ID_REGEX.exec(binId);

	// Return what is matched
	if (idMatch) {
		return idMatch[0];
	}

	// If it's not recognized, error out
	throw new NodeApiError(
		context.getNode(),
		{},
		{
			message: 'Bin ID format is not valid',
			description: 'Please check the provided Bin ID and try again.',
			parseXml: false,
		},
	);
}

/**
 * Creates correctly-formatted PostBin API URL based on the entered binId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 */
export async function buildBinAPIURL(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const binId = parseBinId(this);
	// Assemble the PostBin API URL and put it back to requestOptions
	requestOptions.url = `/api/bin/${binId}`;

	return requestOptions;
}

/**
 * Creates correctly-formatted PostBin Bin test URL based on the entered binId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 */
export async function buildBinTestURL(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const binId = parseBinId(this);

	// Assemble the PostBin API URL and put it back to requestOptions
	requestOptions.url = `/${binId}`;
	return requestOptions;
}

/**
 * Creates correctly-formatted PostBin API URL based on the entered binId and reqId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 */
export async function buildRequestURL(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const reqId = this.getNodeParameter('requestId', 'shift') as string;
	const binId = parseBinId(this);

	requestOptions.url = `/api/bin/${binId}/req/${reqId}`;
	return requestOptions;
}

/**
 * Converts the bin response data and adds additional properties
 *
 */
export async function transformBinResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	items.forEach(
		(item) =>
			(item.json = {
				binId: item.json.binId,
				nowTimestamp: item.json.now,
				nowIso: new Date(item.json.now as string).toISOString(),
				expiresTimestamp: item.json.expires,
				expiresIso: new Date(item.json.expires as string).toISOString(),
				requestUrl: 'https://www.postb.in/' + (item.json.binId as string),
				viewUrl: 'https://www.postb.in/b/' + (item.json.binId as string),
			}),
	);
	return items;
}
