import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	NodeOperationError,
	PreSendAction,
} from 'n8n-workflow';

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
				`The '${parameterName}' property must be valid JSON, but cannot be parsed: ${err}`,
			);
		}
		return requestOptions;
	};
};
