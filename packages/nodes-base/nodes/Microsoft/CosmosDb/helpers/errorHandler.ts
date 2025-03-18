import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';

import type { IErrorResponse } from './interfaces';

const errorMap: Record<string, string> = {
	// Duplicate container
	'Resource with specified id, name, or unique index already exists.': '',
};

export async function handleError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const error = response.body as IErrorResponse;
		let errorMessage = error.message;
		let errorDetails: string[] | undefined = undefined;

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
