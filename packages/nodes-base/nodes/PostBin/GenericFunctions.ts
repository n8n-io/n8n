import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';

// Regular expressions used to extract binId from parameter value
const BIN_STRING_REGEX = /Bin '(\d+-\d+)'/g;
const BIN_URL_REGEX = /https:\/\/www\.toptal\.com\/developers\/postbin\/b\/(\d+-\d+)/g;

/**
 * Creates correctly-formatted PostBin API URL based on the entered binId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 * @export
 * @param {IExecuteSingleFunctions} this
 * @param {IHttpRequestOptions} requestOptions
 * @returns {Promise<IHttpRequestOptions>} requestOptions
 */
export async function buildBinAPIURL(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions>  {
	let binId = this.getNodeParameter('binId') as string;
	// Parse binId from parameter value
	binId = parseBinId(binId);
	// Assemble the PostBin API URL and put it back to requestOptions
	requestOptions.url = `/developers/postbin/api/bin/${binId}`;
	return requestOptions;
}

/**
 * Creates correctly-formatted PostBin Bin test URL based on the entered binId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 * @export
 * @param {IExecuteSingleFunctions} this
 * @param {IHttpRequestOptions} requestOptions
 * @returns {Promise<IHttpRequestOptions>} requestOptions
 */
export async function buildBinTestURL(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
	let binId = this.getNodeParameter('binId') as string;
	// Parse binId from parameter value
	binId = parseBinId(binId);
	// Assemble the PostBin API URL and put it back to requestOptions
	requestOptions.url = `/developers/postbin/${binId}`;
	return requestOptions;
}

/**
 * Creates correctly-formatted PostBin API URL based on the entered binId and reqId.
 * This function makes sure binId is in the expected format by parsing it
 * from current node parameter value.
 *
 * @export
 * @param {IExecuteSingleFunctions} this
 * @param {IHttpRequestOptions} requestOptions
 * @returns {Promise<IHttpRequestOptions>} requestOptions
 */
export async function buildRequestURL(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
	const reqId = this.getNodeParameter('requestId', 'shift') as string;

	let binId = this.getNodeParameter('binId') as string;
	binId = parseBinId(binId);

	requestOptions.url = `/developers/postbin/api/bin/${binId}/req/${reqId}`;
	return requestOptions;
}

/**
 * Extracts the PostBin Bin Id from the specified string.
 * This method should be able to extract bin Id from the
 * PostBin URL or from the string in the following format:
 * `Bin '<binId>'.`
 *
 * @param {IExecuteSingleFunctions} this
 * @param {IHttpRequestOptions} requestOptions
 * @returns {Promise<IHttpRequestOptions>} requestOptions
 */
function parseBinId(binId: string) {
	// Test if bin id has been copied from website in the format `Bin '<binId>'`
	const stringMatch = BIN_STRING_REGEX.exec(binId);
	// Test if bin URL has been pasted instead if bin id
	const urlMatch = BIN_URL_REGEX.exec(binId);

	// Return what is matched
	if (stringMatch) {
		return stringMatch[1];
	}

	if(urlMatch) {
		return urlMatch[1];
	}
	// Fall back to returning whatever is passed in the first place
 return binId;
}
