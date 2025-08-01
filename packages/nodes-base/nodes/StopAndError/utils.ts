import type { JsonObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
export interface ErrorHandlerResult {
	message: string;
	options?: {
		description?: string;
		type?: string;
		level: 'error';
		metadata?: JsonObject;
	};
}
export function createErrorFromParameters(
	errorType: 'errorMessage' | 'errorObject',
	errorParameter: string,
): ErrorHandlerResult {
	if (errorType === 'errorMessage') {
		return {
			message: errorParameter,
		};
	} else {
		const errorObject = jsonParse<JsonObject>(errorParameter);

		const errorMessage =
			(errorObject.message as string) ||
			(errorObject.description as string) ||
			(errorObject.error as string) ||
			`Error: ${JSON.stringify(errorObject)}`;

		return {
			message: errorMessage,
			options: {
				description: (errorObject.description as string) || undefined,
				type: (errorObject.type as string) || undefined,
				level: 'error',
				metadata: errorObject,
			},
		};
	}
}
