import {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	JsonObject,
	NodeApiError,
	NodeOperationError,
	PreSendAction,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';

/**
 * A custom API request function to be used with the resourceLocator lookup queries.
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	query = query || {};

	type N8nApiCredentials = {
		apiKey: string;
		baseUrl: string;
	};

	const credentials = (await this.getCredentials('n8nApi')) as N8nApiCredentials;
	const baseUrl = credentials.baseUrl;

	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri: `${baseUrl.replace(new RegExp('/$'), '')}/${endpoint}`,
		json: true,
	};

	try {
		return this.helpers.requestWithAuthentication.call(this, 'n8nApi', options);
	} catch (error) {
		if (error instanceof NodeApiError) {
			throw error;
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	query = query || {};
	const returnData: IDataObject[] = [];

	let nextCursor: string | undefined = undefined;
	let responseData;

	do {
		query.cursor = nextCursor;
		query.limit = 100;
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.data);
		nextCursor = responseData.nextCursor as string | undefined;
	} while (nextCursor);
	return returnData;
}

/**
 * Get a cursor-based paginator to use with n8n 'getAll' type endpoints.
 *
 * It will look up a 'nextCursor' in the response and if the node has
 * 'returnAll' set to true, will consecutively include it as the 'cursor' query
 * parameter for the next request, effectively getting everything in slices.
 *
 * Prequisites:
 * - routing.send.paginate must be set to true, for all requests to go through here
 * - node is expected to have a boolean parameter 'returnAll'
 * - no postReceive action setting the rootProperty, to get the items mapped
 *
 * @returns A ready-to-use cursor-based paginator function.
 */
export const getCursorPaginator = () => {
	return async function cursorPagination(
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		if (!requestOptions.options.qs) {
			requestOptions.options.qs = {};
		}

		let executions: INodeExecutionData[] = [];
		let responseData: INodeExecutionData[];
		let nextCursor: string | undefined = undefined;
		const returnAll = this.getNodeParameter('returnAll', true) as boolean;

		const extractItems = (page: INodeExecutionData) => {
			const items = page.json.data as IDataObject[];
			if (items) {
				// Extract the items themselves
				executions = executions.concat(items.map((item) => ({ json: item })));
			}
		};

		do {
			requestOptions.options.qs.cursor = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);

			// Check for another page of items
			const lastItem = responseData[responseData.length - 1].json;
			nextCursor = lastItem.nextCursor as string | undefined;

			responseData.forEach(extractItems);

			// If we don't return all, just return the first page
		} while (returnAll && nextCursor);

		return executions;
	};
};

/**
 * A helper function to parse a node parameter as JSON and set it in the request body.
 * Throws a NodeOperationError is the content is not valid JSON or it cannot be set.
 *
 * Currently, parameters with type 'json' are not validated automatically.
 * Also mapping the value for 'body.data' declaratively has it treated as a string,
 * but some operations (e.g. POST /credentials) don't work unless it is set as an object.
 * To get the JSON-body operations to work consistently, we need to parse and set the body
 * manually.
 *
 * @param parameterName The name of the node parameter to parse
 * @param setAsBodyProperty An optional property name to set the parsed data into
 * @returns The requestOptions with its body replaced with the contents of the parameter
 */
export const parseAndSetBodyJson = (
	parameterName: string,
	setAsBodyProperty?: string,
): PreSendAction => {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		try {
			const rawData = this.getNodeParameter(parameterName, '{}') as string;
			const parsedObject = JSON.parse(rawData);

			// Set the parsed object to either as the request body directly, or as its sub-property
			if (setAsBodyProperty === undefined) {
				requestOptions.body = parsedObject;
			} else {
				requestOptions.body = Object.assign({}, requestOptions.body, {
					[setAsBodyProperty]: parsedObject,
				});
			}
		} catch (err) {
			throw new NodeOperationError(
				this.getNode(),
				new Error(`The '${parameterName}' property must be valid JSON, but cannot be parsed`, {
					cause: err,
				}),
			);
		}
		return requestOptions;
	};
};

/**
 * A helper function to prepare the workflow object data for creation. It only sets
 * known workflow properties, for pre-emptively avoiding a HTTP 400 Bad Request
 * response until we have a better client-side schema validation mechanism.
 *
 * NOTE! This expects the requestOptions.body to already be set as an object,
 * so take care to first call parseAndSetBodyJson().
 */
export const prepareWorkflowCreateBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as IDataObject;
	const newBody: IDataObject = {};

	newBody.name = body.name || 'My workflow';
	newBody.nodes = body.nodes || [];
	newBody.settings = body.settings || {};
	newBody.connections = body.connections || {};
	newBody.staticData = body.staticData || null;

	requestOptions.body = newBody;

	return requestOptions;
};

/**
 * A helper function to prepare the workflow object data for update.
 *
 * NOTE! This expects the requestOptions.body to already be set as an object,
 * so take care to first call parseAndSetBodyJson().
 */
export const prepareWorkflowUpdateBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as IDataObject;
	const newBody: IDataObject = {};

	if (body.name) {
		newBody.name = body.name;
	}
	if (body.nodes) {
		newBody.nodes = body.nodes;
	}
	if (body.settings) {
		newBody.settings = body.settings;
	}
	if (body.connections) {
		newBody.connections = body.connections;
	}
	if (body.staticData) {
		newBody.staticData = body.staticData;
	}

	requestOptions.body = newBody;

	return requestOptions;
};
