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

export interface IRunExecutionDataV0 {
	version?: 0; // Missing version means version 0
	startData?: {
		startNodes?: StartNodeData[];
		destinationNode?: string;
		originalDestinationNode?: string;
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
	 * Random token used to validate waiting webhook requests.
	 * Stored when the waiting URL is generated, validated when the webhook is called.
	 */
	waitingToken?: string;
	waitTill?: Date;
	pushRef?: string;

	/** Data needed for a worker to run a manual execution. */
	manualData?: Pick<
		IWorkflowExecutionDataProcess,
		'dirtyNodeNames' | 'triggerToStartFrom' | 'userId'
	>;
}
