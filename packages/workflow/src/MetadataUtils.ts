// import type { INodeExecutionData } from '.';

function hasKey<T extends string>(obj: unknown, key: T): obj is Record<T, unknown> {
	return obj !== null && typeof obj === 'object' && obj.hasOwnProperty(key);
}

function responseHasSubworkflowData(
	response: unknown,
): response is { executionId: string; workflowId: string } {
	return ['executionId', 'workflowId'].every(
		(x) => hasKey(response, x) && typeof response[x] === 'string',
	);
}

// export function parseMetadata(response: unknown): Pick<INodeExecutionData, 'metadata'> | undefined {
export function parseMetadata(response: unknown) {
	return responseHasSubworkflowData(response)
		? {
				subExecution: {
					executionId: response.executionId,
					workflowId: response.workflowId,
				},
			}
		: undefined;
}

export function parseMetadataFromError(error: unknown) {
	if (hasKey(error, 'response')) {
		return parseMetadata(error.response);
	}
	return undefined;
}
