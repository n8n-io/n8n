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
		// 'Split Out' is the only terminal node; it ran but emitted 0 items.
		// 'IF' is lastNodeExecuted but has an outgoing connection to 'Next' (not executed),
		// so it is NOT terminal and cannot be reached via terminalNodesWithMainOutput.
		// The filter must exclude 'Split Out' so the fallback fires and returns IF's items.
		const runData: IRunData = {
			'Split Out': [{ data: { main: [[]] } }] as unknown as ITaskData[], // terminal, 0 items
			IF: [
				{
					data: {
						main: [[], [{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]],
					},
				},
			] as unknown as ITaskData[], // non-terminal (connected to Next)
		};

		const workflow = {
			nodes: [
				mock<INode>({ name: 'Trigger', disabled: false }),
				mock<INode>({ name: 'Split Out', disabled: false }),
				mock<INode>({ name: 'IF', disabled: false }),
				mock<INode>({ name: 'Next', disabled: false }),
			],
			connections: {
				Trigger: {
					main: [
						[
							{ node: 'Split Out', type: 'main', index: 0 },
							{ node: 'IF', type: 'main', index: 0 },
						],
					],
				},
				// Split Out: no outgoing connections → terminal
				IF: { main: [[{ node: 'Next', type: 'main', index: 0 }]] }, // non-terminal
			} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'IF' },
			workflow,
			{ lastRunOnly: false, mode: 'integrated' },
		);

		// terminalNodesWithMainOutput = [] (Split Out has 0 items → filtered out)
		// → falls back to lastNodeExecuted = 'IF'
		expect(output).toEqual([[{ json: { id: 55 } }, { json: { id: 56 } }, { json: { id: 57 } }]]);
	});

	it('falls back to lastNodeExecuted when terminal nodes are AI subnodes with no main output (n8n-io/n8n#36393)', () => {
		// 'AI Tool' is the only terminal node; it ran but stores data under 'ai_tool', not 'main'.
		// 'AI Agent' is lastNodeExecuted and has an outgoing main connection to 'Set' (not executed),
		// so it is NOT terminal and cannot be reached via terminalNodesWithMainOutput.
		// The filter must exclude 'AI Tool' so the fallback fires and returns AI Agent's items.
		const runData: IRunData = {
			'AI Tool': [
				{ data: { ai_tool: [[{ json: { result: 'tool ran' } }]] } },
			] as unknown as ITaskData[], // terminal, no main data
			'AI Agent': [{ data: { main: [[{ json: { text: 'hello' } }]] } }] as unknown as ITaskData[], // non-terminal (connected to Set)
		};

		const aiSubnodeWorkflow = {
			nodes: [
				mock<INode>({ name: 'AI Agent', disabled: false }),
				mock<INode>({ name: 'AI Tool', disabled: false }),
				mock<INode>({ name: 'Set', disabled: false }),
			],
			connections: {
				// AI Tool: no outgoing main connections → terminal (connected via ai_tool category)
				'AI Agent': { main: [[{ node: 'Set', type: 'main', index: 0 }]] }, // non-terminal
			} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'AI Agent' },
			aiSubnodeWorkflow,
			{ lastRunOnly: false, mode: 'integrated' },
		);

		// terminalNodesWithMainOutput = [] (AI Tool has no main items → filtered out)
		// → falls back to lastNodeExecuted = 'AI Agent'
		expect(output).toEqual([[{ json: { text: 'hello' } }]]);
	});

	it('falls back to lastNodeExecuted when lastRunOnly=true and the final terminal run is empty', () => {
		// Terminal node has two runs: run[0] has items, run[1] is empty.
		// With lastRunOnly=true, only run[1] is collected → 0 items.
		// The predicate must apply the same lastRunOnly selection; otherwise it passes on
		// run[0]'s items and terminalNodesWithMainOutput.length > 0, blocking the fallback.
		const runData: IRunData = {
			Terminal: [
				{ executionIndex: 0, data: { main: [[{ json: { id: 1 } }]] } }, // has items
				{ executionIndex: 1, data: { main: [[]] } }, // empty — the last run
			] as unknown as ITaskData[],
			Source: [{ data: { main: [[{ json: { id: 99 } }]] } }] as unknown as ITaskData[],
		};

		const workflow = {
			nodes: [
				mock<INode>({ name: 'Source', disabled: false }),
				mock<INode>({ name: 'Terminal', disabled: false }),
			],
			connections: {
				Source: { main: [[{ node: 'Terminal', type: 'main', index: 0 }]] },
				// Terminal: no outgoing connections → terminal
			} as IConnections,
		};

		const output = buildSubWorkflowOutputFromRunData(
			{ runData, lastNodeExecuted: 'Source' },
			workflow,
			{ lastRunOnly: true },
		);

		// With lastRunOnly=true: Terminal's last run is empty → filtered out of
		// terminalNodesWithMainOutput → falls back to lastNodeExecuted = 'Source'
		expect(output).toEqual([[{ json: { id: 99 } }]]);
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
