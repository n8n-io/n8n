import type {
	ExecutionError,
	IExecuteContextData,
	IExecuteData,
	IExecutionContext,
	IPinData,
	IRunData,
	ITaskMetadata,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	IWorkflowExecutionDataProcess,
	RelatedExecution,
	StartNodeData,
} from '..';
import type { IRunExecutionDataV0 } from './run-execution-data.v0';

// DIFF: switches startData.destinationNode to a structured object, rather than just the name of the string.
export interface IRunExecutionDataV1 {
	version: 1;
	startData?: {
		startNodes?: StartNodeData[];
		destinationNode?: {
			nodeName: string;
			mode: 'inclusive' | 'exclusive';
		};
		originalDestinationNode?: {
			nodeName: string;
			mode: 'inclusive' | 'exclusive';
		};
		runNodeFilter?: string[];
	};
	resultData: {
		error?: ExecutionError;
		runData: IRunData;
		pinData?: IPinData;
		lastNodeExecuted?: string;
		metadata?: Record<string, string>;
	};
	executionData?: {
		contextData: IExecuteContextData;
		runtimeData?: IExecutionContext;
		nodeExecutionStack: IExecuteData[];
		metadata: {
			// node-name: metadata by runIndex
			[key: string]: ITaskMetadata[];
		};
		waitingExecution: IWaitingForExecution;
		waitingExecutionSource: IWaitingForExecutionSource | null;
	};
	parentExecution?: RelatedExecution;
	/**
	 * This is used to prevent breaking change
	 * for waiting executions started before signature validation was added
	 */
	validateSignature?: boolean;
	waitTill?: Date;
	pushRef?: string;

	/** Data needed for a worker to run a manual execution. */
	manualData?: Pick<
		IWorkflowExecutionDataProcess,
		'dirtyNodeNames' | 'triggerToStartFrom' | 'userId'
	>;
}

export function runExecutionDataV0ToV1(data: IRunExecutionDataV0): IRunExecutionDataV1 {
	const destinationNodeV0 = data.startData?.destinationNode;
	const originalDestinationNodeV0 = data.startData?.originalDestinationNode;

	return {
		...data,
		version: 1,
		startData: {
			...data.startData,
			destinationNode: destinationNodeV0
				? {
						nodeName: destinationNodeV0,
						mode: 'inclusive',
					}
				: undefined,
			originalDestinationNode: originalDestinationNodeV0
				? {
						nodeName: originalDestinationNodeV0,
						mode: 'inclusive',
					}
				: undefined,
		},
	};
}
