import flatted from 'flatted';
import type { IConnections, INode, IPairedItemData, IRunData } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

const TRIGGER_NAME = 'Trigger';
const SPLIT_OUT_ITEM = "={{ $('Split Out').item.json.list }}";

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: `${name.toLowerCase().replace(/ /g, '-')}-id`,
	name,
	type,
	typeVersion: type === 'n8n-nodes-base.set' ? 3.4 : 1,
	position: [0, 0],
	parameters,
});

/** A Set node that writes each field from an expression, and nothing else. */
const set = (name: string, fields: Record<string, string>): INode =>
	node(name, 'n8n-nodes-base.set', {
		assignments: {
			assignments: Object.entries(fields).map(([field, value]) => ({
				id: `${field}-id`,
				name: field,
				value,
				type: 'number',
			})),
		},
		options: {},
	});

const loop = (name: string, batchSize: number): INode => ({
	...node(name, 'n8n-nodes-base.splitInBatches', { batchSize, options: {} }),
	typeVersion: 3,
});

const to = (name: string) => [{ node: name, type: 'main' as const, index: 0 }];

//                                    ┌────────┐  done  ┌────────┐  done  ┌───────┐
// ┌─────────┐   ┌───────────┐        │        ├───────►│        ├───────►│ After │
// │ Trigger ├──►│ Split Out ├───────►│ Loop 1 │        │ Loop 2 │        └───────┘
// └─────────┘   └───────────┘        │        ├─┐ loop │        ├─┐ loop
//   list: 1-5                        └──▲─────┘ │      └──▲─────┘ │   ┌───┐
//                                       │       │         │       └──►│ D ├─┐
//                                       │       │         │           └───┘ │
//                                       │       │         └─────────────────┘
//                                       │       │   ┌───┐   ┌───┐   ┌───┐
//                                       │       └──►│ X ├──►│ Y ├──►│ C ├─┐
//                                       │           └───┘   └───┘   └───┘ │
//                                       └─────────────────────────────────┘
// Loop 1 hands out two items per pass, Loop 2 one. C reads X two hops back and
// Split Out through Loop 1. D reads Split Out through Loop 2 and then Loop 1,
// so it needs the passes of the earlier loop. After reads Split Out through both
// loops, and the done item of Loop 2's last pass.
const workflow = {
	name: 'Loop paired items',
	nodes: [
		node(TRIGGER_NAME, 'n8n-nodes-base.manualTrigger'),
		node('Split Out', 'n8n-nodes-base.splitOut', { fieldToSplitOut: 'list', options: {} }),
		loop('Loop 1', 2),
		set('X', { n: '={{ $json.list }}' }),
		node('Y', 'n8n-nodes-base.noOp'),
		set('C', { fromX: "={{ $('X').item.json.n }}", fromSplitOut: SPLIT_OUT_ITEM }),
		loop('Loop 2', 1),
		set('D', { fromSplitOut: SPLIT_OUT_ITEM }),
		set('After', {
			fromSplitOut: SPLIT_OUT_ITEM,
			fromLoop2: "={{ $('Loop 2').item.json.fromSplitOut }}",
		}),
	],
	connections: {
		[TRIGGER_NAME]: { main: [to('Split Out')] },
		'Split Out': { main: [to('Loop 1')] },
		'Loop 1': { main: [to('Loop 2'), to('X')] },
		X: { main: [to('Y')] },
		Y: { main: [to('C')] },
		C: { main: [to('Loop 1')] },
		'Loop 2': { main: [to('After'), to('D')] },
		D: { main: [to('Loop 2')] },
	} satisfies IConnections,
	pinData: { [TRIGGER_NAME]: [{ json: { list: [1, 2, 3, 4, 5] } }] },
};

/** `field` of each item of `nodeName`, per run. */
const valuesOf = (runData: IRunData, nodeName: string, field: string) =>
	(runData[nodeName] ?? []).map((run) => (run.data?.main[0] ?? []).map(({ json }) => json[field]));

/**
 * The `list` value of the Split Out item that each item of `nodeName` links back
 * to, per run. It follows the links as the data proxy does: the item's own
 * address if it has one, else the source of the run. Every item in this
 * workflow comes from exactly one item, so more than one link is an error.
 */
function splitOutValues(runData: IRunData, nodeName: string): unknown[][] {
	return (runData[nodeName] ?? []).map((task, run) =>
		(task.data?.main[0] ?? []).map((_, index) => {
			let at = { node: nodeName, run, slot: 0, index };
			for (let hop = 0; at.node !== 'Split Out'; hop++) {
				if (hop > 20) return `no way back from ${nodeName}`;
				const pairedItem = runData[at.node]?.[at.run]?.data?.main[at.slot]?.[at.index]?.pairedItem;
				const links: IPairedItemData[] =
					pairedItem === undefined
						? []
						: typeof pairedItem === 'number'
							? [{ item: pairedItem }]
							: [pairedItem].flat();
				const [link] = links;
				if (links.length !== 1) {
					return `${links.length} links at ${at.node}/${at.run}/${at.slot}/${at.index}`;
				}
				const address = link.sourceOverwrite ?? runData[at.node][at.run].source[link.input ?? 0];
				if (!address) return `no source at ${at.node}/${at.run}`;
				at = {
					node: address.previousNode,
					run: address.previousNodeRun ?? 0,
					slot: address.previousNodeOutput ?? 0,
					index: link.item,
				};
			}
			return runData['Split Out'][at.run].data?.main[at.slot]?.[at.index]?.json.list;
		}),
	);
}

test.describe(
	'Paired items through loops',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test('should resolve $(…).item inside, between and after loops @engine:v2', async ({ api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow(workflow);
			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			const { resultData } = flatted.parse(execution.data);
			expect(execution.status, resultData.error?.message).toBe('success');
			const runData: IRunData = resultData.runData;

			// The values the nodes resolved while they ran.
			await test.step('C reads X two hops back inside the loop', () => {
				expect.soft(valuesOf(runData, 'C', 'fromX')).toEqual([[1, 2], [3, 4], [5]]);
			});

			await test.step('C reads Split Out through the loop node', () => {
				expect.soft(valuesOf(runData, 'C', 'fromSplitOut')).toEqual([[1, 2], [3, 4], [5]]);
			});

			await test.step('D reads Split Out through the second loop and the first', () => {
				expect.soft(valuesOf(runData, 'D', 'fromSplitOut')).toEqual([[1], [2], [3], [4], [5]]);
			});

			await test.step('After reads Split Out and the last pass of Loop 2', () => {
				expect.soft(valuesOf(runData, 'After', 'fromSplitOut')).toEqual([[1, 2, 3, 4, 5]]);
				expect.soft(valuesOf(runData, 'After', 'fromLoop2')).toEqual([[1, 2, 3, 4, 5]]);
			});

			// The links that the execution view reads.
			await test.step('The execution data links every item back to its Split Out item', () => {
				expect.soft(splitOutValues(runData, 'C')).toEqual([[1, 2], [3, 4], [5]]);
				expect.soft(splitOutValues(runData, 'D')).toEqual([[1], [2], [3], [4], [5]]);
				expect.soft(splitOutValues(runData, 'After')).toEqual([[1, 2, 3, 4, 5]]);
			});
		});
	},
);
