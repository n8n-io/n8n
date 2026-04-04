import type { IDataObject, JsonObject } from 'n8n-workflow';

type GraphQlErrorDetails = {
	message: string;
	errorData: JsonObject;
};

const isErrorObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null;

export const getGraphQlErrorDetails = (errors: unknown): GraphQlErrorDetails => {
	if (Array.isArray(errors)) {
		const message =
			errors.map((error: IDataObject) => error.message as string).join(', ') || 'Unexpected error';

		return {
			message,
			errorData: errors as unknown as JsonObject,
		};
	}

	if (isErrorObject(errors) && typeof errors.message === 'string' && errors.message.length > 0) {
		return {
			message: errors.message,
			errorData: { message: errors.message },
		};
	}

	const message =
		typeof errors === 'string'
			? errors || 'Unexpected error'
			: JSON.stringify(errors) || 'Unexpected error';

	return {
		message,
		errorData: { message },
	};
};
