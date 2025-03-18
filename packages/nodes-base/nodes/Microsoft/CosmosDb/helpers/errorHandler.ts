import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';

import type { IErrorResponse } from './interfaces';

export const ErrorMap = {
	Container: {
		Conflict: {
			message: 'The specified container already exists',
			description: "Use a unique value for 'ID' and try again",
		},
		NotFound: {
			message: "The required container doesn't match any existing one",
			description: "Double-check the value in the parameter 'Container' and try again",
		},
	},
	Item: {
		NotFound: {
			message: "The required item doesn't match any existing one",
			description: "Double-check the value in the parameter 'Item' and try again",
		},
	},
};

export async function handleError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;
		const error = response.body as IErrorResponse;
		let errorMessage = error.message;
		let errorDetails: string[] | undefined = undefined;

		if (resource === 'container') {
			if (error.code === 'Conflict') {
				throw new NodeApiError(
					this.getNode(),
					error as unknown as JsonObject,
					ErrorMap.Container.Conflict,
				);
			}
			if (error.code === 'NotFound') {
				throw new NodeApiError(
					this.getNode(),
					error as unknown as JsonObject,
					ErrorMap.Container.NotFound,
				);
			}
		} else if (resource === 'item') {
			if (error.code === 'NotFound') {
				throw new NodeApiError(
					this.getNode(),
					error as unknown as JsonObject,
					ErrorMap.Item.NotFound,
				);
			}
		}

		try {
			// Certain error responses have nested Message
			errorMessage = jsonParse<{
				message: string;
			}>(errorMessage).message;
		} catch {}

		const match = errorMessage.match(/Message: ({.*?})/);
		if (match?.[1]) {
			try {
				errorDetails = jsonParse<{
					Errors: string[];
				}>(match[1]).Errors;
			} catch {}
		}

		if (errorDetails && errorDetails.length > 0) {
			throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
				message: error.code,
				description: errorDetails.join('\n'),
			});
		} else {
			throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
				message: error.code,
				description: error.message,
			});
		}
	}
	return data;
}
