import type { IExecutionContext } from './execution-context';
import type {
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
import type { IRunExecutionData } from './run-execution-data/run-execution-data';
import type {
	IRunExecutionDataV1,
	RedactionInfo,
} from './run-execution-data/run-execution-data.v1';
import { generateSecureToken } from './utils';

export interface CreateFullRunExecutionDataOptions {
	startData?: {
		startNodes?: StartNodeData[];
		destinationNode?: NonNullable<IRunExecutionData['startData']>['destinationNode'];
		originalDestinationNode?: NonNullable<
			IRunExecutionData['startData']
		>['originalDestinationNode'];
		runNodeFilter?: string[];
	};
	resultData?: {
		error?: ExecutionError;
		runData?: IRunData | null;
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
		runtimeData?: IExecutionContext;
	} | null;
	parentExecution?: RelatedExecution;
	resumeToken?: string;
	waitTill?: Date;
	manualData?: IRunExecutionData['manualData'];
	pushRef?: IRunExecutionData['pushRef'];
	redactionInfo?: RedactionInfo;
}

function buildResultData(
	resultData: CreateFullRunExecutionDataOptions['resultData'],
): IRunExecutionDataV1['resultData'] {
	return {
		error: resultData?.error,
		// @ts-expect-error CAT-752
		runData: resultData?.runData === null ? undefined : (resultData?.runData ?? {}),
		pinData: resultData?.pinData,
		lastNodeExecuted: resultData?.lastNodeExecuted,
		metadata: resultData?.metadata,
	};
}

function buildExecutionData(
	executionData: CreateFullRunExecutionDataOptions['executionData'],
): IRunExecutionDataV1['executionData'] {
	if (executionData === null) return undefined;
	return {
		contextData: executionData?.contextData ?? {},
		nodeExecutionStack: executionData?.nodeExecutionStack ?? [],
		metadata: executionData?.metadata ?? {},
		waitingExecution: executionData?.waitingExecution ?? {},
		waitingExecutionSource: executionData?.waitingExecutionSource ?? {},
		runtimeData: executionData?.runtimeData,
	};
}

/**
 * Creates a complete IRunExecutionData object with all properties initialized.
 * You can pass `executionData: null` and `resultData.runData: null` if you
 * don't want them initialized.
 */
export function createRunExecutionData(
	options: CreateFullRunExecutionDataOptions = {},
): IRunExecutionData {
	return {
		version: 1,
		startData: options.startData ?? {},
		resultData: buildResultData(options.resultData),
		executionData: buildExecutionData(options.executionData),
		parentExecution: options.parentExecution,
		resumeToken: options.resumeToken ?? generateSecureToken(),
		waitTill: options.waitTill,
		manualData: options.manualData,
		pushRef: options.pushRef,
		redactionInfo: options.redactionInfo,
	} satisfies IRunExecutionDataV1 as unknown as IRunExecutionData; // NOTE: we cast to unknown to avoid manual construction of branded type.
}

/**
 * Creates a minimal IRunExecutionData object. It only contains an empty
 * `runData` field. Used when we are not actually executing a workflow, but
 * need the run data. E.g. in expression evaluations.
 */
export function createEmptyRunExecutionData(): IRunExecutionData {
	return {
		version: 1,
		resultData: {
			runData: {},
		},
	} satisfies IRunExecutionDataV1 as unknown as IRunExecutionData; // NOTE: we cast to unknown to avoid manual construction of branded type.
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
		version: 1,
		startData: {
			destinationNode: {
				nodeName: node.name,
				mode: 'inclusive',
			},
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
	} satisfies IRunExecutionDataV1 as unknown as IRunExecutionData; // NOTE: we cast to unknown to avoid manual construction of branded type.
}
