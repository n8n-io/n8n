import { GROUP_NODE_TYPE } from '../src/constants';
import {
	getGroupEntryMap,
	getRunnableNodes,
	hasGroupNodes,
	isEmptyGroup,
	resolveGroupConnections,
} from '../src/group-execution-graph';
import { getInteriorEntryNodes, getInteriorExitNodes, isInsideGroup } from '../src/group-node';
import { NodeConnectionTypes, type IConnections, type INode } from '../src/interfaces';

function node(name: string, parentId?: string): INode {
	return {
		id: name.toLowerCase(),
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

function group(id: string, name = id, parentId?: string): INode {
	return {
		id,
		name,
		type: GROUP_NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

/** Builds main connections from `'A->B'` style pairs. */
function connect(...edges: Array<[string, string]>): IConnections {
	const connections: IConnections = {};

	for (const [from, to] of edges) {
		const bySource = (connections[from] ??= {});
		const main = (bySource[NodeConnectionTypes.Main] ??= [[]]);
		(main[0] ??= []).push({ node: to, type: NodeConnectionTypes.Main, index: 0 });
	}

	return connections;
}

/** Flattens resolved connections to a sorted `'A->B'` list for comparison. */
function edgesOf(connections: IConnections): string[] {
	const edges: string[] = [];

	for (const [from, outputs] of Object.entries(connections)) {
		(outputs[NodeConnectionTypes.Main] ?? []).forEach((targets, outputIndex) => {
			for (const target of targets ?? []) {
				edges.push(`${from}:${outputIndex}->${target.node}`);
			}
		});
	}

	return edges.sort();
}

describe('group boundary semantics', () => {
	describe('interior entry and exit nodes', () => {
		it('reports an interior chain as one entry and one exit', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('C', 'g')];
			const connections = connect(['A', 'B'], ['B', 'C']);

			expect(getInteriorEntryNodes(nodes, connections, 'g').map((n) => n.name)).toEqual(['A']);
			expect(getInteriorExitNodes(nodes, connections, 'g').map((n) => n.name)).toEqual(['C']);
		});

		it('reports every unfed interior node as an entry', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('C', 'g')];
			const connections = connect(['A', 'C'], ['B', 'C']);

			expect(getInteriorEntryNodes(nodes, connections, 'g').map((n) => n.name)).toEqual(['A', 'B']);
			expect(getInteriorExitNodes(nodes, connections, 'g').map((n) => n.name)).toEqual(['C']);
		});

		it('ignores connections that leave the group when finding entries', () => {
			// `Outside` feeds `A`, but it is not a sibling, so `A` stays an entry.
			const nodes = [group('g'), node('A', 'g'), node('Outside')];
			const connections = connect(['Outside', 'A']);

			expect(getInteriorEntryNodes(nodes, connections, 'g').map((n) => n.name)).toEqual(['A']);
		});

		it('treats an empty group as having no entries and no exits', () => {
			const nodes = [group('g')];

			expect(getInteriorEntryNodes(nodes, {}, 'g')).toEqual([]);
			expect(getInteriorExitNodes(nodes, {}, 'g')).toEqual([]);
			expect(isEmptyGroup(nodes, 'g')).toBe(true);
		});
	});

	describe('fan-in: one group input to many interior entries', () => {
		it('broadcasts the group input to every entry node', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('Src')];
			const connections = connect(['Src', 'g']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'Src:0->A',
				'Src:0->B',
			]);
		});

		it('delivers to a single entry node unchanged', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('Src')];
			const connections = connect(['Src', 'g'], ['A', 'B']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual(['A:0->B', 'Src:0->A']);
		});
	});

	describe('collect: many interior exits to one group output', () => {
		it('emits from every exit node onto the group output target', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('Dst')];
			const connections = connect(['g', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'A:0->Dst',
				'B:0->Dst',
			]);
		});

		it('emits only from the exit of an interior chain', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('Dst')];
			const connections = connect(['A', 'B'], ['g', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual(['A:0->B', 'B:0->Dst']);
		});
	});

	describe('empty group', () => {
		it('forwards its input to its output unchanged', () => {
			const nodes = [group('g'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g'], ['g', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual(['Src:0->Dst']);
		});

		it('drops the edge when nothing follows the empty group', () => {
			const nodes = [group('g'), node('Src')];
			const connections = connect(['Src', 'g']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([]);
		});

		it('passes through a chain of two empty groups', () => {
			const nodes = [group('g1'), group('g2'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g1'], ['g1', 'g2'], ['g2', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual(['Src:0->Dst']);
		});
	});

	describe('single interior node', () => {
		it('routes through the one node in and out', () => {
			const nodes = [group('g'), node('Mid', 'g'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g'], ['g', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'Mid:0->Dst',
				'Src:0->Mid',
			]);
		});
	});

	describe('multi-entry and multi-exit interior', () => {
		it('broadcasts in and collects out at the same time', () => {
			// Interior holds two unconnected nodes, so both are entry and exit.
			const nodes = [group('g'), node('A', 'g'), node('B', 'g'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g'], ['g', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'A:0->Dst',
				'B:0->Dst',
				'Src:0->A',
				'Src:0->B',
			]);
		});

		it('handles a diamond interior', () => {
			const nodes = [
				group('g'),
				node('In', 'g'),
				node('Left', 'g'),
				node('Right', 'g'),
				node('Out', 'g'),
				node('Src'),
				node('Dst'),
			];
			const connections = connect(
				['Src', 'g'],
				['In', 'Left'],
				['In', 'Right'],
				['Left', 'Out'],
				['Right', 'Out'],
				['g', 'Dst'],
			);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'In:0->Left',
				'In:0->Right',
				'Left:0->Out',
				'Out:0->Dst',
				'Right:0->Out',
				'Src:0->In',
			]);
		});
	});

	describe('nested groups', () => {
		it('resolves through both boundaries', () => {
			// g1 holds g2; g2 holds Inner. g2 is g1's only interior node.
			const nodes = [
				group('g1'),
				group('g2', 'g2', 'g1'),
				node('Inner', 'g2'),
				node('Src'),
				node('Dst'),
			];
			const connections = connect(['Src', 'g1'], ['g1', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'Inner:0->Dst',
				'Src:0->Inner',
			]);
		});

		it('passes through an empty group nested in a group', () => {
			const nodes = [group('g1'), group('g2', 'g2', 'g1'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g1'], ['g1', 'Dst']);

			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual(['Src:0->Dst']);
		});

		it('reports containment through the parent chain', () => {
			const nodes = [group('g1'), group('g2', 'g2', 'g1'), node('Inner', 'g2')];
			const nodesById = new Map(nodes.map((n) => [n.id, n]));

			expect(isInsideGroup(nodesById, 'inner', 'g2')).toBe(true);
			expect(isInsideGroup(nodesById, 'inner', 'g1')).toBe(true);
			expect(isInsideGroup(nodesById, 'g2', 'g1')).toBe(true);
			expect(isInsideGroup(nodesById, 'g1', 'g2')).toBe(false);
		});
	});

	describe('trigger as the interior entry', () => {
		it('keeps the trigger reachable and collects its output', () => {
			const trigger: INode = {
				...node('Trigger', 'g'),
				type: 'n8n-nodes-base.manualTrigger',
			};
			const nodes = [group('g'), trigger, node('After', 'g'), node('Dst')];
			const connections = connect(['Trigger', 'After'], ['g', 'Dst']);

			// The trigger has no incoming boundary edge; the interior still runs
			// and its exit collects onto the group output.
			expect(edgesOf(resolveGroupConnections(nodes, connections))).toEqual([
				'After:0->Dst',
				'Trigger:0->After',
			]);
			expect(getInteriorEntryNodes(nodes, connections, 'g').map((n) => n.name)).toEqual([
				'Trigger',
			]);
		});
	});

	describe('graph hygiene', () => {
		it('leaves an ungrouped workflow untouched', () => {
			const nodes = [node('A'), node('B')];
			const connections = connect(['A', 'B']);

			expect(hasGroupNodes(nodes)).toBe(false);
			expect(resolveGroupConnections(nodes, connections)).toBe(connections);
		});

		it('is idempotent', () => {
			const nodes = [group('g'), node('Mid', 'g'), node('Src'), node('Dst')];
			const connections = connect(['Src', 'g'], ['g', 'Dst']);

			const once = resolveGroupConnections(nodes, connections);
			const twice = resolveGroupConnections(nodes, once);

			expect(edgesOf(twice)).toEqual(edgesOf(once));
		});

		it('drops group nodes from the runnable set', () => {
			const nodes = [group('g'), node('Mid', 'g'), node('Src')];

			expect(getRunnableNodes(nodes).map((n) => n.name)).toEqual(['Mid', 'Src']);
		});

		it('copies non-main connections through untouched', () => {
			const nodes = [group('g'), node('Agent', 'g'), node('Model')];
			const connections: IConnections = {
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			};

			expect(resolveGroupConnections(nodes, connections).Model).toEqual(connections.Model);
		});

		it('survives a group cycle without hanging', () => {
			// Malformed: two groups feed each other and both are empty.
			const nodes = [group('g1'), group('g2'), node('Src')];
			const connections = connect(['Src', 'g1'], ['g1', 'g2'], ['g2', 'g1']);

			expect(() => resolveGroupConnections(nodes, connections)).not.toThrow();
		});

		it('maps each group to its interior entry nodes for the canvas', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g')];
			const connections = connect(['A', 'B']);

			expect(getGroupEntryMap(nodes, connections)).toEqual(new Map([['g', ['A']]]));
		});
	});
});
