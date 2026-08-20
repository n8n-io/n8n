/**
 * A minimal in-process workflow execution harness for the memory guard
 * benchmarks.
 *
 * The setup mirrors `packages/core/nodes-testing/node-test-harness.ts`
 * (`executeWorkflow`), reduced to what a benchmark needs: a chain of stub nodes,
 * a real `ExecutionLifecycleHooks`, and no DI container.
 *
 * Two details keep the container out of the measurement:
 * - `executionData.runtimeData` is pre-set, so `establishExecutionContext`
 *   returns early instead of resolving `ExecutionContextService`.
 * - The stub node declares no properties, so validation has nothing to check.
 */
import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IRun,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	LoggerProxy,
	NodeConnectionTypes,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';

const NODE_TYPE_NAME = 'benchPassThrough';

/**
 * Silences this module graph's copy of the logger proxy. `vitest.config.ts` sets
 * `N8N_LOG_LEVEL=silent`, which covers the engine's own (CJS) copy; this covers
 * the ESM copy the bench files resolve.
 */
export function silenceEngineLogging() {
	const noOp = () => {};
	LoggerProxy.init({ error: noOp, warn: noOp, info: noOp, debug: noOp });
}

/** Returns its input unchanged, so per-node cost is engine plus hooks only. */
const passThroughNode: INodeType = {
	description: {
		displayName: 'Bench Pass Through',
		name: NODE_TYPE_NAME,
		group: ['transform'],
		version: 1,
		description: 'A minimal node for benchmarking the execution engine',
		defaults: { name: 'Bench Pass Through' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await Promise.resolve([this.getInputData()]);
	},
};

const nodeTypeData: Record<string, { type: INodeType; sourcePath: string }> = {
	[NODE_TYPE_NAME]: { type: passThroughNode, sourcePath: '' },
};

const nodeTypes: INodeTypes = {
	getByName: (name) => nodeTypeData[name].type,
	getByNameAndVersion: (name, version) =>
		NodeHelpers.getVersionedNodeType(nodeTypeData[name].type, version),
	getKnownTypes: () => ({}),
};

/** A linear chain of `length` pass-through nodes, so cost scales with node count. */
export function buildChainWorkflow(length: number): Workflow {
	const nodes: INode[] = [];
	const connections: Record<
		string,
		{ main: Array<Array<{ node: string; type: 'main'; index: number }>> }
	> = {};

	for (let i = 0; i < length; i++) {
		const name = `node${i}`;
		nodes.push({
			id: name,
			name,
			type: NODE_TYPE_NAME,
			typeVersion: 1,
			position: [i * 100, 0],
			parameters: {},
		});
		if (i > 0) {
			connections[`node${i - 1}`] = { main: [[{ node: name, type: 'main', index: 0 }]] };
		}
	}

	return new Workflow({
		id: 'bench',
		nodes,
		connections,
		active: false,
		nodeTypes,
		settings: { executionOrder: 'v1' },
	});
}

/**
 * `IWorkflowExecuteAdditionalData` reduced to the fields the engine reads on a
 * normal node run. `restartExecutionId` stays undefined on purpose: a truthy
 * value sends the engine down the resume path.
 */
export function buildAdditionalData(hooks: unknown): IWorkflowExecuteAdditionalData {
	return {
		credentialsHelper: {
			authenticate: async (_c: unknown, _t: string, requestParams: IHttpRequestOptions) =>
				await Promise.resolve(requestParams),
		},
		executionId: 'bench',
		currentNodeExecutionIndex: 0,
		restartExecutionId: undefined,
		webhookWaitingBaseUrl: 'http://localhost/waiting-webhook',
		formWaitingBaseUrl: 'http://localhost/waiting-form',
		webhookBaseUrl: 'http://localhost/webhook',
		webhookTestBaseUrl: 'http://localhost/webhook-test',
		instanceBaseUrl: 'http://localhost',
		variables: {},
		hooks,
	} as unknown as IWorkflowExecuteAdditionalData;
}

/**
 * Run data seeded with `items` on the first node. Two details matter:
 * - The chain is seeded on `node0` explicitly. `workflow.getStartNode()` returns
 *   undefined here, because the stub node is neither a trigger nor one of
 *   `STARTING_NODE_TYPES`.
 * - `runtimeData` is pre-set, so the engine skips the DI-backed context setup.
 */
export function buildRunExecutionData(
	workflow: Workflow,
	items: INodeExecutionData[],
): IRunExecutionData {
	const runExecutionData = createRunExecutionData({
		executionData: {
			waitingExecutionSource: null,
			nodeExecutionStack: [
				{ node: workflow.getNode('node0')!, data: { main: [items] }, source: null },
			],
		},
	});

	runExecutionData.executionData!.runtimeData = {
		version: 1,
		establishedAt: 0,
		source: 'manual',
	};

	return runExecutionData;
}

export type { IRun };
