import type { IExecuteFunctions, ITaskMetadata } from '.';
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

export const asTokenCount = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

const addTokenCount = (prev: number, delta: number | undefined): number => {
	if (delta === undefined) return prev;
	const sum = prev + delta;
	return Number.isSafeInteger(sum) ? sum : prev;
};

export function accumulateTokenUsage(
	context: IExecuteFunctions,
	inputTokens: number | undefined,
	outputTokens: number | undefined,
): void {
	const validInput = asTokenCount(inputTokens);
	const validOutput = asTokenCount(outputTokens);
	if (validInput === undefined && validOutput === undefined) return;

	const prev = context.getExecuteData()?.metadata?.tokenUsage;
	const prevInput = asTokenCount(prev?.inputTokens) ?? 0;
	const prevOutput = asTokenCount(prev?.outputTokens) ?? 0;

	context.setMetadata({
		tokenUsage: {
			inputTokens: addTokenCount(prevInput, validInput),
			outputTokens: addTokenCount(prevOutput, validOutput),
		},
	});
}

export function parseErrorMetadata(error: unknown): ISubWorkflowMetadata | undefined {
	if (hasKey(error, 'errorResponse')) {
		return parseErrorResponseWorkflowMetadata(error.errorResponse);
	}

	// This accounts for cases where the backend attaches the properties on plain errors
	// e.g. from custom nodes throwing literal `Error` or `ApplicationError` objects directly
	return parseErrorResponseWorkflowMetadata(error);
}
