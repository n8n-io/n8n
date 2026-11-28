import type { JsonObject } from 'n8n-workflow';

export interface ErrorHandlerResult {
	message: string;
	options?: {
		description?: string;
		type?: string;
		level: 'error';
		metadata?: JsonObject;
	};
}

function isString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

export function createErrorFromParameters(errorParameter: string | JsonObject): ErrorHandlerResult {
	if (typeof errorParameter === 'string') {
		return {
			message: errorParameter,
		};
	} else {
		const errorObject = errorParameter;

		const errorMessage =
			(isString(errorObject.message) ? errorObject.message : '') ||
			(isString(errorObject.description) ? errorObject.description : '') ||
			(isString(errorObject.error) ? errorObject.error : '') ||
			`Error: ${JSON.stringify(errorObject)}`;

		return {
			message: errorMessage,
			options: {
				description: isString(errorObject.description) ? errorObject.description : undefined,
				type: isString(errorObject.type) ? errorObject.type : undefined,
				level: 'error',
				metadata: errorObject,
			},
		};
	}
}
