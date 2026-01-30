import type { ErrorLevel } from '@n8n/errors';
import { NodeOperationError, type INode, type NodeApiError } from 'n8n-workflow';

export const JSONSafeParse = <T>(source?: string) => {
	try {
		if (!source) {
			return undefined;
		}
		return JSON.parse(source) as T;
	} catch {
		return undefined;
	}
};

export const parseApiError = (error: NodeApiError) => {
	if (!('messages' in error) || !error.messages.length) {
		return (error as Error).message;
	} else {
		const message = error.messages[0];
		try {
			const messageJSON = JSON.parse(message.substring(message.indexOf('{'))) as
				| {
						message: string;
						error: string;
				  }
				| {
						msg: string;
				  };

			// v2 api errors
			if ('msg' in messageJSON) {
				return {
					message: messageJSON.msg,
					error: '',
				};
			} else {
				return messageJSON;
			}
		} catch {
			return message;
		}
	}
};

export const parseToApiNodeOperationError = ({
	node,
	errorLevel,
	subject,
	error,
}: {
	subject?: string;
	errorLevel?: ErrorLevel;
	error: NodeApiError;
	node: INode;
}) => {
	const parsedError = parseApiError(error);
	const errorMessage = typeof parsedError === 'object' ? parsedError.message : parsedError;
	return new NodeOperationError(
		node,
		new Error(subject ? `${subject} ${errorMessage}` : errorMessage),
		{
			level: errorLevel ?? 'warning',
		},
	);
};
