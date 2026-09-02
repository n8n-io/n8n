import type { IConnections, INode, IRunData, ITaskData } from '../src/interfaces';
import {
	buildSubWorkflowOutputFromRunData,
	flattenSubWorkflowBranches,
	getSortedNodeRuns,
	getTerminalNodeNames,
	mergeRunsPerBranch,
	triggerReturnsLastRunOnly,
} from '../src/sub-workflow-output';
import { mock } from 'vitest-mock-extended';

function buildRun(outputBranches: { json: object }[][]): ITaskData {
	return {
		data: {
			main: outputBranches,
		},
	} as unknown as ITaskData;
}

describe('mergeRunsPerBranch', () => {
	it('returns an empty array for no runs', () => {
		expect(mergeRunsPerBranch([])).toEqual([]);
	});

	it('returns a single run unchanged', () => {
		const singleRun = buildRun([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		const singleRunUnchanged = [[{ json: { id: 1 } }, { json: { id: 2 } }]];

		expect(mergeRunsPerBranch([singleRun])).toEqual(singleRunUnchanged);
	});

	it('concatenates items across runs on the single main branch', () => {
		const firstRun = buildRun([[{ json: { id: 0 } }]]);
		const secondRun = buildRun([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
		const thirdRun = buildRun([[{ json: { id: 3 } }]]);

		const allItemsConcatenatedOnOneBranch = [
			[{ json: { id: 0 } }, { json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }],
		];

		expect(mergeRunsPerBranch([firstRun, secondRun, thirdRun])).toEqual(
			allItemsConcatenatedOnOneBranch,
		);
	});

	it('preserves multi-output shape and concatenates per branch', () => {
		const firstRun = buildRun([[{ json: { primary: 0 } }], [{ json: { secondary: 0 } }]]);
		const secondRun = buildRun([[{ json: { primary: 1 } }], [{ json: { secondary: 1 } }]]);

		const mergedPrimaryBranch = [{ json: { primary: 0 } }, { json: { primary: 1 } }];
		const mergedSecondaryBranch = [{ json: { secondary: 0 } }, { json: { secondary: 1 } }];

		expect(mergeRunsPerBranch([firstRun, secondRun])).toEqual([
			mergedPrimaryBranch,
			mergedSecondaryBranch,
		]);
	});

	it('tolerates missing branches across runs', () => {
		const runWithPrimaryBranchOnly = buildRun([[{ json: { primary: 0 } }]]);
		const runWithBothBranches = buildRun([
			[{ json: { primary: 1 } }],
			[{ json: { secondary: 1 } }],
		]);
		const mergedPrimaryBranch = [{ json: { primary: 0 } }, { json: { primary: 1 } }];
		const secondaryBranchFromTheOnlyRunThatProducedIt = [{ json: { secondary: 1 } }];

		expect(mergeRunsPerBranch([runWithPrimaryBranchOnly, runWithBothBranches])).toEqual([
			mergedPrimaryBranch,
			secondaryBranchFromTheOnlyRunThatProducedIt,
		]);
	});
});

describe('flattenSubWorkflowBranches', () => {
	it('concatenates all branches into a single list', () => {
		expect(
			flattenSubWorkflowBranches([
				[{ json: { id: 55 } }],
				[{ json: { id: 56 } }, { json: { id: 57 } }],
			]),
		).toEqual([{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]);
	});
});

describe('getTerminalNodeNames', () => {
	const nodes = [
		mock<INode>({ name: 'Trigger', disabled: false }),
		mock<INode>({ name: 'Branch', disabled: false }),
		mock<INode>({ name: 'Done', disabled: false }),
	];

	const connections: IConnections = {
		Trigger: { main: [[{ node: 'Branch', type: 'main', index: 0 }]] },
		Branch: {
			main: [
				[{ node: 'Done', type: 'main', index: 0 }],
				[{ node: 'Done', type: 'main', index: 0 }],
			],
		},
	};

	it('returns nodes without outgoing main connections', () => {
		expect(getTerminalNodeNames(nodes, connections)).toEqual(['Done']);
	});

	it('ignores disabled nodes', () => {
		const disabledTerminal = [...nodes.slice(0, 2), mock<INode>({ name: 'Done', disabled: true })];
		expect(getTerminalNodeNames(disabledTerminal, connections)).toEqual([]);
	});
});

describe('buildSubWorkflowOutputFromRunData', () => {
	const TERMINAL_NODE = 'do whatever1';
	const DEAD_END_IF = 'If test == "test"1';

	const workflow = {
		nodes: [
			mock<INode>({ name: 'When Executed by Another Workflow', disabled: false }),
			mock<INode>({ name: DEAD_END_IF, disabled: false }),
			mock<INode>({ name: 'If test == "test"', disabled: false }),
			mock<INode>({ name: 'do whatever', disabled: false }),
			mock<INode>({ name: TERMINAL_NODE, disabled: false }),
		],
		connections: {
			'When Executed by Another Workflow': {
				main: [
					[
						{ node: DEAD_END_IF, type: 'main', index: 0 },
						{ node: 'If test == "test"', type: 'main', index: 0 },
					],
				],
			},
			[DEAD_END_IF]: {
				main: [[{ node: 'do whatever2', type: 'main', index: 0 }], []],
			},
			'If test == "test"': {
				main: [
					[{ node: 'do whatever', type: 'main', index: 0 }],
					[{ node: TERMINAL_NODE, type: 'main', index: 0 }],
				],
			},
			'do whatever': {
				main: [[{ node: TERMINAL_NODE, type: 'main', index: 0 }]],
			},
		} as IConnections,
	};

	it('returns terminal node output when lastNodeExecuted is a parallel dead-end IF (n8n-io/n8n#36378)', () => {
		const runData: IRunData = {
			[TERMINAL_NODE]: [
				{
					data: {
						main: [[{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]],
					},
				},
			] as unknown as ITaskData[],
			[DEAD_END_IF]: [
				{
					data: {
						main: [[], [{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]],
					},
				},
			] as unknown as ITaskData[],
		};

		const output = buildSubWorkflowOutputFromRunData(
			{
				runData,
				lastNodeExecuted: DEAD_END_IF,
			},
			workflow,
			{ lastRunOnly: false, mode: 'integrated' },
		);

		expect(output).toEqual([[{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]]);
		expect(output).not.toEqual([[{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]]);
	});

	it('interleaves multiple terminal node runs by executionIndex', () => {
		const runData: IRunData = {
			'Terminal A': [
				{
					executionIndex: 0,
					data: { main: [[{ json: { label: 'a0' } }]] },
				},
				{
					executionIndex: 2,
					data: { main: [[{ json: { label: 'a2' } }]] },
				},
			] as unknown as ITaskData[],
			'Terminal B': [
				{
					executionIndex: 1,
					data: { main: [[{ json: { label: 'b1' } }]] },
				},
			] as unknown as ITaskData[],
		};

		const multiTerminalWorkflow = {
			nodes: [
				mock<INode>({ name: 'Terminal A', disabled: false }),
				mock<INode>({ name: 'Terminal B', disabled: false }),
			],
			connections: {} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData({ runData }, multiTerminalWorkflow, {
			lastRunOnly: false,
		});

		expect(output).toEqual([
			[{ json: { label: 'a0' } }, { json: { label: 'b1' } }, { json: { label: 'a2' } }],
		]);
	});

	it('flattens multi-branch terminal output onto the single main branch', () => {
		const runData: IRunData = {
			'Final IF': [
				{
					data: {
						main: [[], [{ json: { id: 1 } }, { json: { id: 2 } }]],
					},
				},
			] as unknown as ITaskData[],
		};

		const ifWorkflow = {
			nodes: [mock<INode>({ name: 'Final IF', disabled: false })],
			connections: {} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'Final IF' },
			ifWorkflow,
			{ lastRunOnly: false },
		);

		expect(output).toEqual([[{ json: { id: 1 } }, { json: { id: 2 } }]]);
	});

	it('falls back to lastNodeExecuted when a terminal node ran but produced zero items (n8n-io/n8n#36393)', () => {
		// Repro: trigger fans out to (a) Split Out over an empty array (terminal, 0 items) and
		// (b) an always-false IF whose false output is unconnected.  Split Out satisfies the old
		// `terminalNodesWithRuns` guard even though it has no items, so `lastNodeExecuted` never
		// fired and the result was `[null]`.
		const runData: IRunData = {
			'Split Out': [
				{ data: { main: [[]] } }, // ran, but no items
			] as unknown as ITaskData[],
			'Always-false IF': [
				{
					data: {
						main: [[], [{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]],
					},
				},
			] as unknown as ITaskData[],
		};

		const emptyTerminalWorkflow = {
			nodes: [
				mock<INode>({ name: 'Trigger', disabled: false }),
				mock<INode>({ name: 'Split Out', disabled: false }),
				mock<INode>({ name: 'Always-false IF', disabled: false }),
			],
			connections: {
				Trigger: {
					main: [
						[
							{ node: 'Split Out', type: 'main', index: 0 },
							{ node: 'Always-false IF', type: 'main', index: 0 },
						],
					],
				},
				// Split Out has no outgoing connections → terminal
				// Always-false IF: false branch unconnected, true branch unconnected → terminal
			} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'Always-false IF' },
			emptyTerminalWorkflow,
			{ lastRunOnly: false, mode: 'integrated' },
		);

		expect(output).toEqual([[{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]]);
	});

	it('falls back to lastNodeExecuted when terminal nodes are AI subnodes with no main output (n8n-io/n8n#36393)', () => {
		// AI subnodes have no outgoing `main` connections (connected via ai_tool etc.) so they
		// appear as terminal nodes. Their run data is keyed `ai_tool` / `ai_memory` / etc., not
		// `main`. The old guard treated them as contributing, producing `[null]` instead of
		// falling back to `lastNodeExecuted`.
		const runData: IRunData = {
			'AI Tool': [
				{
					data: {
						// AI subnodes store output under ai_* keys, not main
						ai_tool: [[{ json: { result: 'tool ran' } }]],
					},
				},
			] as unknown as ITaskData[],
			'Chat Model': [{ data: { main: [[{ json: { text: 'hello' } }]] } }] as unknown as ITaskData[],
		};

		const aiSubnodeWorkflow = {
			nodes: [
				mock<INode>({ name: 'Chat Model', disabled: false }),
				mock<INode>({ name: 'AI Tool', disabled: false }),
			],
			connections: {
				// AI Tool connected via ai_tool, not main → appears terminal
				'Chat Model': {
					main: [[]], // no outgoing main → terminal
				},
			} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'Chat Model' },
			aiSubnodeWorkflow,
			{ lastRunOnly: false, mode: 'integrated' },
		);

		expect(output).toEqual([[{ json: { text: 'hello' } }]]);
	});

	it('falls back to lastNodeExecuted when no terminal node produced output', () => {
		const runData: IRunData = {
			'Last node executed': [
				{ data: { main: [[{ json: { itemId: 0 } }]] } },
				{ data: { main: [[{ json: { itemId: 1 } }]] } },
			] as unknown as ITaskData[],
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'Last node executed' },
			{ nodes: [], connections: {} },
			{ lastRunOnly: false },
		);

		expect(output).toEqual([[{ json: { itemId: 0 } }, { json: { itemId: 1 } }]]);
	});
});

describe('getSortedNodeRuns', () => {
	it('sorts runs by executionIndex', () => {
		const runData: IRunData = {
			Node: [
				mock<ITaskData>({ executionIndex: 2, data: { main: [[{ json: { value: 2 } }]] } }),
				mock<ITaskData>({ executionIndex: 0, data: { main: [[{ json: { value: 0 } }]] } }),
			],
		};

		expect(getSortedNodeRuns(runData, 'Node').map((run) => run.executionIndex)).toEqual([0, 2]);
	});
});

describe('triggerReturnsLastRunOnly', () => {
	function trigger(typeVersion: number, returnOutput?: string): INode {
		return mock<INode>({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion,
			parameters: returnOutput === undefined ? {} : { returnOutput },
		});
	}

	it('returns false for v1.2+ triggers', () => {
		expect(triggerReturnsLastRunOnly([trigger(1.2)])).toBe(false);
	});

	it('returns true for pre-1.2 triggers by default', () => {
		expect(triggerReturnsLastRunOnly([trigger(1.1)])).toBe(true);
	});

	it('returns false when a pre-1.2 trigger opted into allRuns', () => {
		expect(triggerReturnsLastRunOnly([trigger(1.1, 'allRuns')])).toBe(false);
	});
});
