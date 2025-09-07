import type {
	IRunExecutionData,
	IRunData,
	IPinData,
	IExecuteContextData,
	IExecuteData,
	ITaskMetadata,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	StartNodeData,
	ExecutionError,
	RelatedExecution,
	INode,
} from './interfaces';

export interface CreateFullRunExecutionDataOptions {
	startData?: {
		startNodes?: StartNodeData[];
		destinationNode?: string;
		originalDestinationNode?: string;
		runNodeFilter?: string[];
	};
	resultData?: {
		error?: ExecutionError;
		runData?: IRunData;
		pinData?: IPinData;
		lastNodeExecuted?: string;
		metadata?: Record<string, string>;
	};
	executionData?: {
		contextData?: IExecuteContextData;
		nodeExecutionStack?: IExecuteData[];
		metadata?: Record<string, ITaskMetadata[]>;
		waitingExecution?: IWaitingForExecution;
		waitingExecutionSource?: IWaitingForExecutionSource | null;
	};
	parentExecution?: RelatedExecution;
	validateSignature?: boolean;
	waitTill?: Date;
	manualData?: IRunExecutionData['manualData'];
}

/**
 * Creates a complete IRunExecutionData object with all properties initialized
 */
export function createRunExecutionData(
	options: CreateFullRunExecutionDataOptions = {},
): IRunExecutionData {
	const runExecutionData: IRunExecutionData = {
		startData: options.startData ?? {},
		resultData: {
			error: options.resultData?.error,
			runData: options.resultData?.runData ?? {},
			pinData: options.resultData?.pinData,
			lastNodeExecuted: options.resultData?.lastNodeExecuted,
			metadata: options.resultData?.metadata,
		},
		executionData: {
			contextData: options.executionData?.contextData ?? {},
			nodeExecutionStack: options.executionData?.nodeExecutionStack ?? [],
			metadata: options.executionData?.metadata ?? {},
			waitingExecution: options.executionData?.waitingExecution ?? {},
			waitingExecutionSource: options.executionData?.waitingExecutionSource ?? {},
		},
		parentExecution: options.parentExecution,
		validateSignature: options.validateSignature,
		waitTill: options.waitTill,
		manualData: options.manualData,
	};

	return runExecutionData;
}

/**
 * Creates a IRunExecutionData object with only the given runData. Used
 * when we are not actually executing a workflow, but need the run data.
 * E.g. in expression evaluations.
 */
export function createEmptyRunExecutionData(): IRunExecutionData {
	return {
		resultData: {
			runData: {},
		},
	};
}

/**
 * Creates an IRunExecutionData object for error execution scenarios.
 * Used when creating execution records for failed nodes with specific
 * error data and execution context.
 *
 * @param node - The node that failed.
 * @param error - The error that occurred.
 */
export function createErrorExecutionData(node: INode, error: ExecutionError): IRunExecutionData {
	return {
		startData: {
			destinationNode: node.name,
			runNodeFilter: [node.name],
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [
				{
					node,
					data: {
						main: [
							[
								{
									json: {},
									pairedItem: {
										item: 0,
									},
								},
							],
						],
					},
					source: null,
				},
			],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		resultData: {
			runData: {
				[node.name]: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						error,
						source: [],
					},
				],
			},
			error,
			lastNodeExecuted: node.name,
		},
	};
}
