import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	NodeConnectionTypes,
	type INode,
	type INodeExecutionData,
	type INodeTypes,
	type INodeTypeDescription,
	type IRun,
	type ITaskData,
} from '../src/interfaces';
import { createRunExecutionData } from '../src/run-execution-data-factory';
import {
	collectSubWorkflowOutput,
	getSubWorkflowOutputPolicy,
	mergeRunsPerBranch,
} from '../src/sub-workflow-output';
import { Workflow } from '../src/workflow';

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

describe('collectSubWorkflowOutput', () => {
	const item = (id: number): INodeExecutionData => ({ json: { id }, pairedItem: { item: id } });

	function workflow(outputs: INodeTypeDescription['outputs'], overrides: Partial<INode> = {}) {
		const node: INode = {
			id: 'last',
			name: 'Last',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				name: 'test',
				displayName: 'Test',
				group: ['transform'],
				version: 1,
				description: '',
				defaults: {},
				inputs: ['main'],
				outputs,
				properties: [{ name: 'numberOutputs', displayName: 'Outputs', type: 'number', default: 1 }],
			},
		});
		return new Workflow({ id: 'child', nodes: [node], connections: {}, nodeTypes, active: false });
	}

	function run(branches: Array<Array<INodeExecutionData[] | null>>): IRun {
		return {
			mode: 'integrated',
			storedAt: 'db',
			startedAt: new Date(),
			status: 'success',
			finished: true,
			data: createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Last',
					runData: {
						Last: branches.map((main, executionIndex) => ({
							startTime: 0,
							executionTime: 0,
							source: [],
							executionIndex,
							data: { main },
						})),
					},
				},
			}),
		};
	}

	it('returns items from the second IF output on one main output', async () => {
		const items = [item(55), item(56), item(57)];
		expect(
			await collectSubWorkflowOutput(run([[[], items]]), workflow(['main', 'main']), {
				lastRunOnly: false,
			}),
		).toEqual([items]);
	});

	it.each([true, false])(
		'excludes Filter discarded items when lastRunOnly is %s',
		async (lastRunOnly) => {
			expect(
				await collectSubWorkflowOutput(
					run([[[item(55)], [item(56), item(57)]]]),
					workflow(['main']),
					{ lastRunOnly },
				),
			).toEqual([[item(55)]]);
			expect(
				await collectSubWorkflowOutput(run([[[], [item(55)]]]), workflow(['main']), {
					lastRunOnly,
				}),
			).toEqual([[]]);
		},
	);

	it('returns the dynamic outputs produced by the node', async () => {
		const child = workflow(
			'={{ Array.from({ length: $parameter.numberOutputs }, () => ({ type: "main" })) }}',
			{ parameters: { numberOutputs: 3 } },
		);
		expect(
			await collectSubWorkflowOutput(run([[[], [], [item(57)]]]), child, { lastRunOnly: false }),
		).toEqual([[item(57)]]);
	});

	it.each([false, true])(
		'keeps input-dependent outputs across runs when lastRunOnly is %s',
		async (lastRunOnly) => {
			const child = workflow(
				'={{ Array.from({ length: $parameter.numberOutputs }, () => ({ type: "main" })) }}',
				{ parameters: { numberOutputs: '={{ $json.outputCount }}' } },
			);
			const input = run([
				[[item(55)], []],
				[[], [], [item(57)]],
			]);
			expect(await collectSubWorkflowOutput(input, child, { lastRunOnly })).toEqual([
				lastRunOnly ? [item(57)] : [item(55), item(57)],
			]);
		},
	);

	it('includes a configured error output', async () => {
		const child = workflow([NodeConnectionTypes.Main], { onError: 'continueErrorOutput' });
		expect(
			await collectSubWorkflowOutput(run([[[], [item(57)]]]), child, { lastRunOnly: false }),
		).toEqual([[item(57)]]);
	});

	it('keeps branch order, execution order, and repeated items', async () => {
		const input = run([
			[[item(1)], [item(2)]],
			[[item(3)], [item(2)]],
		]);
		input.data.resultData.runData.Last.reverse();
		expect(
			await collectSubWorkflowOutput(input, workflow(['main', 'main']), { lastRunOnly: false }),
		).toEqual([[item(1), item(3), item(2), item(2)]]);
	});

	it('uses only the final run when the caller requests it', async () => {
		expect(
			await collectSubWorkflowOutput(
				run([
					[[item(1)], []],
					[[], [item(2)]],
				]),
				workflow(['main', 'main']),
				{ lastRunOnly: true },
			),
		).toEqual([[item(2)]]);
	});

	it('ignores other executed terminals and disconnected pins', async () => {
		const input = run([[[], [item(2)]]]);
		input.mode = 'manual';
		input.data.resultData.runData.Other = [mock<ITaskData>({ data: { main: [[item(1)]] } })];
		input.data.resultData.pinData = { Other: [item(3)] };
		expect(
			await collectSubWorkflowOutput(input, workflow(['main', 'main']), { lastRunOnly: false }),
		).toEqual([[item(2)]]);
	});

	it.each([false, true])(
		'uses terminal pin data in manual mode when lastRunOnly is %s',
		async (lastRunOnly) => {
			const input = run([
				[[item(1)], []],
				[[], [item(2)]],
			]);
			input.mode = 'manual';
			input.data.resultData.pinData = { Last: [item(3), item(4)] };

			expect(
				await collectSubWorkflowOutput(input, workflow(['main', 'main']), { lastRunOnly }),
			).toEqual([
				[
					{ json: item(3), pairedItem: { item: 0 } },
					{ json: item(4), pairedItem: { item: 1 } },
				],
			]);
		},
	);

	it('keeps binary data and item pairing without changing the item', async () => {
		const output = {
			...item(2),
			binary: { file: { data: 'filesystem:binary-id', mimeType: 'text/plain' } },
		};
		const input = run([[[], [output]]]);
		const result = await collectSubWorkflowOutput(input, workflow(['main', 'main']), {
			lastRunOnly: false,
		});
		expect(result[0]?.[0]).toBe(output);
		expect(input.data.resultData.runData.Last[0].data?.main).toEqual([[], [output]]);
	});

	it('distinguishes missing execution data from an empty result', async () => {
		const child = workflow(['main']);
		expect(await collectSubWorkflowOutput(run([]), child, { lastRunOnly: false })).toEqual([null]);
		expect(await collectSubWorkflowOutput(run([[[]]]), child, { lastRunOnly: false })).toEqual([
			[],
		]);
	});

	it('fails when the saved workflow does not contain the executed node', async () => {
		const child = workflow(['main'], { name: 'Other' });

		await expect(
			collectSubWorkflowOutput(run([[[item(1)]]]), child, { lastRunOnly: false }),
		).rejects.toThrow(
			new UnexpectedError('The last executed node is missing from the saved workflow.'),
		);
	});
});

describe('getSubWorkflowOutputPolicy', () => {
	const trigger = (typeVersion: number) =>
		mock<INode>({ type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion });
	it.each([1, 1.1, 1.2])('keeps trigger v%s on the legacy contract', (version) => {
		expect(getSubWorkflowOutputPolicy([trigger(version)], false)).toBeUndefined();
	});
	it('keeps workflows without a sub-workflow trigger on the legacy contract', () => {
		expect(getSubWorkflowOutputPolicy([], false)).toBeUndefined();
	});
	it.each([false, true])('saves the caller override %s for trigger v1.3', (lastRunOnly) => {
		expect(getSubWorkflowOutputPolicy([trigger(1.3)], lastRunOnly)).toEqual({ lastRunOnly });
	});
});
