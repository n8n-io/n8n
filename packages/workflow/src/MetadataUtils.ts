import type { ITaskMetadata } from '.';
import { hasKey } from './utils';

function responseHasSubworkflowData(
	response: unknown,
): response is { executionId: string; workflowId: string } {
	return ['executionId', 'workflowId'].every(
		(x) => hasKey(response, x) && typeof response[x] === 'string',
	);
}

type ISubWorkflowMetadata = Required<Pick<ITaskMetadata, 'subExecution' | 'subExecutionsCount'>>;

function parseErrorResponseWorkflowMetadata(response: unknown): ISubWorkflowMetadata | undefined {
	if (!responseHasSubworkflowData(response)) return undefined;

	return {
		subExecution: {
			executionId: response.executionId,
			workflowId: response.workflowId,
		},
		subExecutionsCount: 1,
	};
}

export function parseErrorMetadata(error: unknown): ISubWorkflowMetadata | undefined {
	if (hasKey(error, 'errorResponse')) {
		return parseErrorResponseWorkflowMetadata(error.errorResponse);
	}
	return undefined;
}
