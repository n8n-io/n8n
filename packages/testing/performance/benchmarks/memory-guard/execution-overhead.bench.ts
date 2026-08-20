/**
 * What the memory guard costs a real workflow execution.
 *
 * `estimate-items-size.bench.ts` times the estimator on its own. That says the
 * function is fast, but not what share of an execution it takes. This file
 * supplies the denominator: the same workflow runs twice, once with the guard's
 * lifecycle handlers attached and once without, so the ratio between the two
 * rows is the guard's cost.
 *
 * "Guard off" is master's behaviour. `ExecutionMemoryTracker.onNodeStart` and
 * `onNodeFinish` both return immediately when `config.enabled` is false, so
 * attaching nothing is faithful.
 *
 * "Guard on" replicates the body of those two methods
 * (`packages/cli/src/memory-guard/execution-memory-tracker.ts`). The tracker
 * itself is not imported, because its `@Service` and `@OnLifecycleEvent`
 * decorators need decorator support this package does not enable. The work
 * measured is the same: one Map lookup per node, plus the estimator walk over
 * every output branch.
 *
 * Node count varies so the per-node slope is readable. A single stub node is
 * cheaper than the engine's fixed startup cost, and reading one chain length
 * alone would overstate the guard's share.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import type { IRunExecutionData, ITaskData, IWorkflowBase } from 'n8n-workflow';
import { bench, describe } from 'vitest';

import { estimateItemsSize } from '../../../../cli/src/memory-guard/estimate-items-size';
import { BENCH_OPTIONS } from '../bench-options';
import { flatItems } from './fixtures/items';
import {
	buildAdditionalData,
	buildChainWorkflow,
	buildRunExecutionData,
	silenceEngineLogging,
} from './fixtures/workflow-run';

silenceEngineLogging();

/** Mirrors `ExecutionMemoryEntry` in the tracker. */
interface TrackerEntry {
	estimatedBytes: number;
	inNodeSince: number | undefined;
	seen: WeakSet<object>;
	runExecutionData: IRunExecutionData | undefined;
}

function attachGuardHandlers(hooks: ExecutionLifecycleHooks) {
	const executions = new Map<string, TrackerEntry>();

	const getOrCreate = (executionId: string) => {
		let entry = executions.get(executionId);
		if (!entry) {
			entry = {
				estimatedBytes: 0,
				inNodeSince: undefined,
				seen: new WeakSet(),
				runExecutionData: undefined,
			};
			executions.set(executionId, entry);
		}
		return entry;
	};

	hooks.addHandler('nodeExecuteBefore', function () {
		getOrCreate(this.executionId).inNodeSince = Date.now();
	});

	hooks.addHandler('nodeExecuteAfter', function (_nodeName, taskData: ITaskData, executionData) {
		const entry = getOrCreate(this.executionId);
		entry.inNodeSince = undefined;
		entry.runExecutionData = executionData;

		const outputs = taskData.data;
		if (!outputs) return;

		for (const runs of Object.values(outputs)) {
			if (!Array.isArray(runs)) continue;
			for (const items of runs) {
				if (items) entry.estimatedBytes += estimateItemsSize(items, entry.seen);
			}
		}
	});
}

const workflowData = {} as unknown as IWorkflowBase;

/**
 * Constructing a `Workflow` resolves parameters for every node, which costs far
 * more than one execution. Build it and the seed items once per case, outside
 * the measured callback, so only the run itself is timed.
 *
 * Everything else must be fresh per iteration: run data accumulates node output,
 * and `WorkflowExecute` carries per-run status and an abort controller.
 */
function makeCase(nodeCount: number, itemCount: number) {
	const workflow = buildChainWorkflow(nodeCount);
	const items = flatItems(itemCount);

	return async (withGuard: boolean) => {
		const hooks = new ExecutionLifecycleHooks('manual', 'bench', workflowData);
		if (withGuard) attachGuardHandlers(hooks);

		const additionalData = buildAdditionalData(hooks);
		const runExecutionData = buildRunExecutionData(workflow, items);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual', runExecutionData);

		await workflowExecute.processRunExecutionData(workflow);
	};
}

// Each case pairs "off" and "on" over identical work. Read the two rows
// together: the ratio between them is what the guard costs. Node count varies so
// the per-node slope is visible, since the engine's fixed startup cost does not
// scale with it.
const CASES = [
	{ nodes: 5, items: 100 },
	{ nodes: 20, items: 100 },
	{ nodes: 20, items: 1_000 },
];

/**
 * A whole execution allocates, so GC pauses land in the samples and inflate the
 * mean. Run longer than the default to push the pauses down into the noise.
 */
const EXECUTION_BENCH_OPTIONS = { ...BENCH_OPTIONS, time: 5_000, warmupTime: 2_000 };

const runners = CASES.map(({ nodes, items }) => ({ nodes, items, run: makeCase(nodes, items) }));

/**
 * Warm both paths before any measurement, at module load.
 *
 * `bench()` runs in declaration order, so "guard off" always went first and paid
 * the JIT cost that "guard on" then inherited. Under CodSpeed that does not wash
 * out: simulation mode counts instructions over few iterations, and vitest's own
 * `warmupIterations` does not apply. The first report showed "guard on" beating
 * "guard off" by 3%, which is impossible, because "on" does strictly more work.
 *
 * Warming both here means each measured run starts from the same compiled state.
 */
for (const { run } of runners) {
	for (let i = 0; i < 30; i++) {
		await run(false);
		await run(true);
	}
}

for (const { nodes, items, run } of runners) {
	describe(`Workflow execution: ${nodes} nodes, ${items} items`, () => {
		bench(
			`guard off (${nodes} nodes, ${items} items)`,
			async () => {
				await run(false);
			},
			EXECUTION_BENCH_OPTIONS,
		);

		bench(
			`guard on (${nodes} nodes, ${items} items)`,
			async () => {
				await run(true);
			},
			EXECUTION_BENCH_OPTIONS,
		);
	});
}
