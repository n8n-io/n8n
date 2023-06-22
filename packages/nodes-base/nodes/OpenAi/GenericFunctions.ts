import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';

import { NodeApiError, jsonParse } from 'n8n-workflow';

export const MODELS_THAT_SUPPORT_FUNCTION = ['gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613'];
const functionsCollection: IDataObject = {};

type Choices = {
	index: number;
	message: {
		role: string;
		content: IDataObject | null;
		function_call?: {
			name: string;
			arguments: string;
		};
	};
	finish_reason: string;
};

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}

export async function callExternalAPI(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	for (const result of data) {
		const finishReason = (result.json?.choices as Choices[])[0]?.finish_reason;
		if (finishReason !== 'function_call') {
			returnItems.push(result);
			continue;
		}

		const functionCall = (result.json?.choices as Choices[])[0]?.message?.function_call;
		if (!functionCall) {
			returnItems.push(result);
			continue;
		}

		const functionArguments = jsonParse<IDataObject>(functionCall.arguments);

		const functionUI = functionsCollection[functionCall.name];

		if (!functionUI) {
			throw new Error(`Function "${functionCall.name}" does not exist.`);
		}

		const { url, method } = functionUI as IDataObject;

		let response;
		try {
			response = await this.helpers.httpRequest({
				url: url as string,
				method: method as IHttpRequestMethods,
				qs: functionArguments,
			});
		} catch (error) {
			throw new NodeApiError(this.getNode(), { message: 'Error calling external API function' });
		}

		const responseData = response;

		returnItems.push({
			json: responseData,
			binary: {},
		});
	}
	return returnItems;
}

export async function prepareFunctions(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (!(requestOptions?.body as IDataObject)?.functions) {
		return requestOptions;
	}

	const functionsUI = (requestOptions.body as IDataObject)?.functions as IDataObject[];

	const functions = functionsUI.map((func) => {
		const { name, description, properties, url, method } = func;

		const requiredProperties: string[] = [];
		const updatedProperties: IDataObject = {};

		for (const property of ((properties as IDataObject).values as IDataObject[]) || []) {
			if (property.required) {
				requiredProperties.push(property.name as string);
			}

			updatedProperties[property.name as string] = {
				type: property.type,
				description: property.description,
			};
		}

		functionsCollection[name as string] = {
			url,
			method,
		};

		return {
			name,
			description,
			parameters: {
				type: 'object',
				properties: updatedProperties,
				required: requiredProperties,
			},
		};
	});

	// return requestOptions;
	const updatedRequestOptions = {
		...requestOptions,
		body: {
			...(requestOptions.body as IDataObject),
			functions,
			function_call: 'auto',
		},
	};

	return updatedRequestOptions;
}
