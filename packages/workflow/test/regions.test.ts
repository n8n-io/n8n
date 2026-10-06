import * as Helpers from './helpers';
import type { IConnections, INode, IWorkflowGroup } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';
import { classifyRegionEdge, regionTreeOf, type RegionTreeInput } from '../src/regions';
import { Workflow } from '../src/workflow';

const nodes = (names: string[]) => names.map((name) => ({ id: name.toLowerCase(), name }));

const chain = (...names: string[]): IConnections =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, index) => [
				name,
				{ main: [[{ node: names[index + 1], type: NodeConnectionTypes.Main, index: 0 }]] },
			]),
	);

const forEach = (
	name: string,
	nodeIds: string[],
	entry: string,
	exit: string,
	batchSize = 1,
): IWorkflowGroup => ({
	id: name,
	name,
	nodeIds,
	repeat: { kind: 'forEach', entry, exits: [{ node: exit, output: 0 }], batchSize },
});

const treeOf = (input: Omit<RegionTreeInput, 'executionOrder'>) =>
	regionTreeOf({ ...input, executionOrder: 'v1' });

const names = (regions: ReadonlyArray<{ name: string }>) => regions.map(({ name }) => name);

describe('classifyRegionEdge', () => {
	it('classifies the edges into, inside, and out of one region', () => {
		const { regions, problems } = treeOf({
			nodes: nodes(['Before', 'A', 'B', 'After']),
			connections: chain('Before', 'A', 'B', 'After'),
			nodeGroups: [forEach('Each', ['a', 'b'], 'a', 'b')],
		});

		expect(problems).toEqual([]);
		expect(names(classifyRegionEdge(regions, 'Before', 'A').enters)).toEqual(['Each']);
		expect(classifyRegionEdge(regions, 'A', 'B')).toEqual({ exits: [], enters: [] });
		expect(names(classifyRegionEdge(regions, 'B', 'After').exits)).toEqual(['Each']);
	});

	it('orders nested regions innermost first on exit and outermost first on entry', () => {
		const { regions, problems } = treeOf({
			nodes: nodes(['Before', 'Orders', 'Line', 'After']),
			connections: chain('Before', 'Orders', 'Line', 'After'),
			nodeGroups: [
				forEach('Each customer', ['orders', 'line'], 'orders', 'line'),
				forEach('Each order', ['line'], 'line', 'line', 2),
			],
		});

		expect(problems).toEqual([]);
		expect(regions.find(({ name }) => name === 'Each order')).toMatchObject({
			parent: 'Each customer',
			depth: 1,
		});
		expect(names(classifyRegionEdge(regions, 'Before', 'Orders').enters)).toEqual([
			'Each customer',
		]);
		expect(names(classifyRegionEdge(regions, 'Orders', 'Line').enters)).toEqual(['Each order']);
		expect(names(classifyRegionEdge(regions, 'Line', 'After').exits)).toEqual([
			'Each order',
			'Each customer',
		]);
	});

	it('leaves one sibling region and enters the next', () => {
		const { regions, problems } = treeOf({
			nodes: nodes(['A', 'B']),
			connections: chain('A', 'B'),
			nodeGroups: [forEach('First', ['a'], 'a', 'a'), forEach('Second', ['b'], 'b', 'b')],
		});

		expect(problems).toEqual([]);
		const edge = classifyRegionEdge(regions, 'A', 'B');
		expect(names(edge.exits)).toEqual(['First']);
		expect(names(edge.enters)).toEqual(['Second']);
	});
});

describe('regionTreeOf', () => {
	const messages = (input: RegionTreeInput) =>
		regionTreeOf(input).problems.map(({ message }) => message);

	it('reports the region rules that a group breaks', () => {
		expect(
			messages({
				nodes: nodes(['Before', 'A', 'B', 'After']),
				connections: chain('Before', 'B', 'A', 'After'),
				nodeGroups: [forEach('Each', ['a', 'b'], 'a', 'a')],
				executionOrder: 'v0',
			}),
		).toEqual([
			'Region "Each": "Before" connects to input 0 of "B". Items can go into a region only on input 0 of its entry "A"',
			'Region "Each" needs execution order v1. Change it in the workflow settings',
		]);
		expect(
			messages({
				nodes: nodes(['A', 'B']),
				connections: chain('A', 'B', 'A'),
				nodeGroups: [forEach('A', ['a', 'b'], 'a', 'b')],
				executionOrder: 'v1',
			}),
		).toEqual([
			'Region "A": its nodes connect in a loop. The region repeats its nodes, so remove the loop',
			'Region "A" has the name of a node. Give the region another name',
		]);
	});

	it('reports an until region without an exit, and a pollUntil entry that is not before the attempt', () => {
		expect(
			messages({
				nodes: nodes(['Before', 'A']),
				connections: chain('Before', 'A'),
				nodeGroups: [
					{
						id: 'Count',
						name: 'Count',
						nodeIds: ['a'],
						repeat: { kind: 'loop', entry: 'a', exits: [], maxIterations: 3, until: '={{ true }}' },
					},
				],
			}),
		).toEqual([
			'Region "Count": it needs an exit, because its exit condition reads the exit items',
		]);
		const poll = (connections: IConnections) =>
			messages({
				nodes: nodes(['Before', 'Wait', 'Status', 'After']),
				connections,
				nodeGroups: [
					{
						id: 'Poll',
						name: 'Poll',
						nodeIds: ['wait', 'status'],
						repeat: {
							kind: 'pollUntil',
							entry: 'wait',
							exits: [{ node: 'status', output: 0 }],
							maxAttempts: 3,
							until: '={{ $json.done }}',
						},
					},
				],
			});
		expect(poll(chain('Before', 'Wait', 'Status', 'After'))).toEqual([]);
		expect(
			poll({
				...chain('Before', 'Wait', 'Status', 'After'),
				Wait: {
					main: [
						[{ node: 'Status', type: NodeConnectionTypes.Main, index: 0 }],
						[{ node: 'Status', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			}),
		).toEqual([
			'Region "Poll": its entry "Wait" runs between attempts, so it must connect from output 0 to input 0 of the attempt nodes, and only to them',
		]);
	});

	it('reports regions that overlap or hold the same nodes', () => {
		const input = { nodes: nodes(['A', 'B', 'C']), connections: chain('A', 'B', 'C') };

		expect(
			messages({
				...input,
				nodeGroups: [forEach('One', ['a', 'b'], 'a', 'b'), forEach('Two', ['b', 'c'], 'b', 'c')],
			}),
		).toEqual([
			'Regions "One" and "Two" overlap. Two regions must be one inside the other, or apart',
		]);
		expect(
			messages({
				...input,
				nodeGroups: [forEach('One', ['b'], 'b', 'b'), forEach('Two', ['b'], 'b', 'b')],
			}),
		).toEqual([
			'Regions "One" and "Two" hold the same nodes. Add a node to the outer region, or remove one region',
		]);
	});
});

describe('Workflow.renameNode with regions', () => {
	const setNode = (name: string): INode => ({
		id: name.toLowerCase(),
		name,
		type: 'test.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: { value1: "={{ $('Each').item.json.id }}" },
	});
	const regionWorkflow = () =>
		new Workflow({
			nodes: [setNode('A'), setNode('B')],
			connections: chain('A', 'B'),
			nodeGroups: [forEach('Each', ['a'], 'a', 'a')],
			active: false,
			nodeTypes: Helpers.NodeTypes(),
		});

	it('renames the region and the expressions that read it', () => {
		const workflow = regionWorkflow();

		workflow.renameNode('Each', 'Per item');

		expect(workflow.nodeGroups.map(({ name }) => name)).toEqual(['Per item']);
		expect(workflow.nodes.B.parameters.value1).toBe("={{ $('Per item').item.json.id }}");
	});

	it('renames a node in the until and next expressions of a region', () => {
		const workflow = new Workflow({
			nodes: [setNode('A'), setNode('B')],
			connections: chain('A', 'B'),
			nodeGroups: [
				{
					id: 'Count',
					name: 'Count',
					nodeIds: ['b'],
					repeat: {
						kind: 'loop',
						entry: 'b',
						exits: [{ node: 'b', output: 0 }],
						maxIterations: 3,
						until: "={{ $json.n >= $('A').item.json.max }}",
						next: "={{ { n: $json.n, max: $('A').item.json.max } }}",
					},
				},
			],
			active: false,
			nodeTypes: Helpers.NodeTypes(),
		});

		workflow.renameNode('A', 'Limits');

		expect(workflow.nodeGroups[0]?.repeat).toMatchObject({
			until: "={{ $json.n >= $('Limits').item.json.max }}",
			next: "={{ { n: $json.n, max: $('Limits').item.json.max } }}",
		});
	});

	it('refuses a name that a node or a region has', () => {
		expect(() => regionWorkflow().renameNode('B', 'Each')).toThrow('is in use');
		expect(() => regionWorkflow().renameNode('Each', 'B')).toThrow('is in use');
	});
});
