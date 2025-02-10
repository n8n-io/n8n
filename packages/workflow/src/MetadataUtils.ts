import type { INodeExecutionData } from '.';
import { hasKey } from './utils';

function responseHasSubworkflowData(
	response: unknown,
): response is { executionId: string; workflowId: string } {
	return ['executionId', 'workflowId'].every(
		(x) => hasKey(response, x) && typeof response[x] === 'string',
	);
}

export function parseMetadata(response: unknown): INodeExecutionData['metadata'] {
	if (!responseHasSubworkflowData(response)) return undefined;

	return {
		subExecution: {
			executionId: response.executionId,
			workflowId: response.workflowId,
		},
	};
}

export function parseMetadataFromError(error: unknown): INodeExecutionData['metadata'] {
	if (hasKey(error, 'errorResponse')) {
		return parseMetadata(error.errorResponse);
	}
	return undefined;
}
