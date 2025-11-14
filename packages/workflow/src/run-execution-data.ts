// Contains all the data which is needed to execute a workflow and so also to
// start restart it again after it did fail.

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
} from '.';

type IDestinationNodeV0 = {
	version: 0;
	destinationNode?: string;
	originalDestinationNode?: string;
};

type IDestinationNodeV1 = {
	version: 1;
	destinationNode?: {
		nodeName: string;
		mode: 'inclusive' | 'exclusive';
	};
	originalDestinationNode?: {
		nodeName: string;
		mode: 'inclusive' | 'exclusive';
	};
};

export type IDestinationNodeAll = IDestinationNodeV0 | IDestinationNodeV1;

export type IDestinationNode = IDestinationNodeV1;

// The RunData, ExecuteData and WaitForExecution contain often the same data.
interface IRunExecutionDataBase {
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

export interface IRunExecutionDataAll extends IRunExecutionDataBase {
	startData: {
		startNodes?: StartNodeData[];
		runNodeFilter?: string[];
	} & IDestinationNodeAll;
}

export interface IRunExecutionData extends IRunExecutionDataBase {
	startData: {
		startNodes?: StartNodeData[];
		runNodeFilter?: string[];
	} & IDestinationNode;
}
