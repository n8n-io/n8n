import { GROUP_NODE_TYPE } from '../src/constants';
import { resolveGroupConnections } from '../src/group-execution-graph';
import {
	migrateGroupNodesToNodeGroups,
	migrateNodeGroupsToGroupNodes,
} from '../src/group-node-migration';
import { validateGroupNodes } from '../src/group-node-validation';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type IWorkflowGroup,
	type NodeConnectionType,
} from '../src/interfaces';

function node(name: string, x = 0, y = 0, type = 'n8n-nodes-base.set'): INode {
	return {
		id: name.toLowerCase(),
		name,
		type,
		typeVersion: 1,
		position: [x, y],
		parameters: {},
	};
}

function connect(...edges: Array<[string, string, NodeConnectionType?]>): IConnections {
	const connections: IConnections = {};

	for (const [from, to, type = NodeConnectionTypes.Main] of edges) {
		const bySource = (connections[from] ??= {});
		const slots = (bySource[type] ??= [[]]);
		(slots[0] ??= []).push({ node: to, type, index: 0 });
	}

	return connections;
}

/** Flattens connections to a sorted `'A->B'` list for comparison. */
function edgesOf(connections: IConnections, type: string = NodeConnectionTypes.Main): string[] {
	const edges: string[] = [];

	for (const [from, outputs] of Object.entries(connections)) {
		for (const targets of outputs[type] ?? []) {
			for (const target of targets ?? []) {
				edges.push(`${from}->${target.node}`);
			}
		}
	}

	return edges.sort();
}

function group(id: string, name: string, nodeIds: string[], description?: string): IWorkflowGroup {
	return { id, name, nodeIds, ...(description === undefined ? {} : { description }) };
}

describe('group node migration', () => {
	describe('forward: nodeGroups to group nodes', () => {
		it('leaves a workflow with no group untouched', () => {
			const nodes = [node('A'), node('B')];
			const connections = connect(['A', 'B']);
			const result = migrateNodeGroupsToGroupNodes({ nodes, connections, nodeGroups: [] });

			expect(result.nodes).toBe(nodes);
			expect(result.connections).toBe(connections);
			expect(result.convertedGroupIds).toEqual([]);
		});

		it('creates a group node carrying the title and the objective', () => {
			const nodes = [node('Mid', 400, 200)];
			const result = migrateNodeGroupsToGroupNodes({
				nodes,
				connections: {},
				nodeGroups: [group('g1', 'End', ['mid'], 'extract transform and load')],
			});

			const groupNode = result.nodes.find((candidate) => candidate.type === GROUP_NODE_TYPE);

			expect(groupNode).toMatchObject({
				// The id carries over, so old references still resolve.
				id: 'g1',
				name: 'End',
				type: GROUP_NODE_TYPE,
				typeVersion: 1,
				parameters: { objective: 'extract transform and load' },
			});
			// The card sits above and left of its members.
			expect(groupNode?.position[0]).toBeLessThan(400);
			expect(groupNode?.position[1]).toBeLessThan(200);
		});

		it('sets parentId on every member', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('A'), node('B'), node('Outside')],
				connections: {},
				nodeGroups: [group('g1', 'Group', ['a', 'b'])],
			});

			const byName = new Map(result.nodes.map((candidate) => [candidate.name, candidate]));

			expect(byName.get('A')?.parentId).toBe('g1');
			expect(byName.get('B')?.parentId).toBe('g1');
			expect(byName.get('Outside')?.parentId).toBeUndefined();
		});

		it("re-points an incoming boundary edge onto the group's port", () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Src'), node('Member')],
				connections: connect(['Src', 'Member']),
				nodeGroups: [group('g1', 'Group', ['member'])],
			});

			expect(edgesOf(result.connections)).toEqual(['Src->Group']);
		});

		it("re-points an outgoing boundary edge onto the group's port", () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Member'), node('Dst')],
				connections: connect(['Member', 'Dst']),
				nodeGroups: [group('g1', 'Group', ['member'])],
			});

			expect(edgesOf(result.connections)).toEqual(['Group->Dst']);
		});

		it('leaves an edge between two members of one group alone', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('A'), node('B')],
				connections: connect(['A', 'B']),
				nodeGroups: [group('g1', 'Group', ['a', 'b'])],
			});

			expect(edgesOf(result.connections)).toEqual(['A->B']);
		});

		it('re-points an edge between two groups onto both ports', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('A'), node('B')],
				connections: connect(['A', 'B']),
				nodeGroups: [group('g1', 'First', ['a']), group('g2', 'Second', ['b'])],
			});

			expect(edgesOf(result.connections)).toEqual(['First->Second']);
		});

		it('copies a non-main connection through untouched', () => {
			const connections = connect(['Model', 'Agent', NodeConnectionTypes.AiLanguageModel]);
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Agent'), node('Model')],
				connections,
				nodeGroups: [group('g1', 'Group', ['agent', 'model'])],
			});

			expect(edgesOf(result.connections, NodeConnectionTypes.AiLanguageModel)).toEqual([
				'Model->Agent',
			]);
		});

		it('keeps a group whose members are all missing, as an empty group', () => {
			// Losing the group would lose the user's work.
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Other')],
				connections: {},
				nodeGroups: [group('g1', 'Ghost', ['gone'])],
			});

			expect(result.convertedGroupIds).toEqual(['g1']);
			expect(result.missingNodeIds).toEqual(['gone']);
			expect(result.nodes.some((candidate) => candidate.id === 'g1')).toBe(true);
		});

		it('never drops a group', () => {
			const groups = [
				group('g1', 'One', ['a']),
				group('g2', 'Two', ['b']),
				group('g3', 'Three', ['missing']),
			];
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('A'), node('B')],
				connections: {},
				nodeGroups: groups,
			});

			expect(result.convertedGroupIds).toEqual(['g1', 'g2', 'g3']);
		});

		it('renames a group node that clashes with an existing node name', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Group'), node('Member')],
				connections: {},
				nodeGroups: [group('g1', 'Group', ['member'])],
			});

			const groupNode = result.nodes.find((candidate) => candidate.type === GROUP_NODE_TYPE);

			// The node named `Group` keeps its name; the group node takes the next free one.
			expect(groupNode?.name).toBe('Group 1');
			expect(result.nodes.filter((candidate) => candidate.name === 'Group')).toHaveLength(1);
		});

		it('gives a node to its first group only', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Shared')],
				connections: {},
				nodeGroups: [group('g1', 'First', ['shared']), group('g2', 'Second', ['shared'])],
			});

			const shared = result.nodes.find((candidate) => candidate.name === 'Shared');

			expect(shared?.parentId).toBe('g1');
		});

		it('produces a workflow the boundary rules accept', () => {
			const result = migrateNodeGroupsToGroupNodes({
				nodes: [node('Src'), node('A'), node('B'), node('Dst')],
				connections: connect(['Src', 'A'], ['A', 'B'], ['B', 'Dst']),
				nodeGroups: [group('g1', 'Group', ['a', 'b'])],
			});

			expect(
				validateGroupNodes({
					nodes: result.nodes,
					connectionsBySourceNode: result.connections,
				}).valid,
			).toBe(true);
		});
	});

	describe('round trip: the converted workflow executes the same', () => {
		// The old model ran the member chain directly, because the engine never
		// saw the group. The new model runs the same chain through the boundary.
		// Resolving the converted graph must give back the original edges.
		it('resolves to the original graph for a single-member group', () => {
			const nodes = [node('Src'), node('Member'), node('Dst')];
			const connections = connect(['Src', 'Member'], ['Member', 'Dst']);
			const result = migrateNodeGroupsToGroupNodes({
				nodes,
				connections,
				nodeGroups: [group('g1', 'Group', ['member'])],
			});

			expect(edgesOf(resolveGroupConnections(result.nodes, result.connections))).toEqual(
				edgesOf(connections),
			);
		});

		it('resolves to the original graph for a member chain', () => {
			const nodes = [node('Src'), node('A'), node('B'), node('C'), node('Dst')];
			const connections = connect(['Src', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'Dst']);
			const result = migrateNodeGroupsToGroupNodes({
				nodes,
				connections,
				nodeGroups: [group('g1', 'Group', ['a', 'b', 'c'])],
			});

			expect(edgesOf(resolveGroupConnections(result.nodes, result.connections))).toEqual(
				edgesOf(connections),
			);
		});

		it('resolves to the original graph for two adjacent groups', () => {
			const nodes = [node('Src'), node('A'), node('B'), node('Dst')];
			const connections = connect(['Src', 'A'], ['A', 'B'], ['B', 'Dst']);
			const result = migrateNodeGroupsToGroupNodes({
				nodes,
				connections,
				nodeGroups: [group('g1', 'First', ['a']), group('g2', 'Second', ['b'])],
			});

			expect(edgesOf(resolveGroupConnections(result.nodes, result.connections))).toEqual(
				edgesOf(connections),
			);
		});

		it('resolves to the original graph when a group has a branching interior', () => {
			const nodes = [node('Src'), node('In'), node('Left'), node('Right'), node('Out')];
			const connections = connect(
				['Src', 'In'],
				['In', 'Left'],
				['In', 'Right'],
				['Left', 'Out'],
				['Right', 'Out'],
			);
			const result = migrateNodeGroupsToGroupNodes({
				nodes,
				connections,
				nodeGroups: [group('g1', 'Group', ['in', 'left', 'right'])],
			});

			expect(edgesOf(resolveGroupConnections(result.nodes, result.connections))).toEqual(
				edgesOf(connections),
			);
		});
	});

	describe('reverse: group nodes to nodeGroups, for a downgrade', () => {
		function groupNode(id: string, name: string, objective = '', parentId?: string): INode {
			return {
				id,
				name,
				type: GROUP_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: { objective },
				...(parentId === undefined ? {} : { parentId }),
			};
		}

		function member(name: string, parentId: string): INode {
			return { ...node(name), parentId };
		}

		it('rebuilds a nodeGroups entry with its title and description', () => {
			const nodes = [groupNode('g1', 'End', 'extract transform and load'), member('A', 'g1')];
			const result = migrateGroupNodesToNodeGroups({ nodes, connections: {} });

			expect(result.nodeGroups).toEqual([
				{ id: 'g1', name: 'End', nodeIds: ['a'], description: 'extract transform and load' },
			]);
			expect(result.droppedGroupIds).toEqual([]);
		});

		it('drops the group node and every parentId', () => {
			const nodes = [groupNode('g1', 'Group'), member('A', 'g1')];
			const result = migrateGroupNodesToNodeGroups({ nodes, connections: {} });

			expect(result.nodes).toEqual([node('A')]);
		});

		it('re-points a boundary edge back onto the interior entry and exit', () => {
			const nodes = [
				node('Src'),
				groupNode('g1', 'Group'),
				member('A', 'g1'),
				member('B', 'g1'),
				node('Dst'),
			];
			const result = migrateGroupNodesToNodeGroups({
				nodes,
				connections: connect(['Src', 'Group'], ['A', 'B'], ['Group', 'Dst']),
			});

			expect(edgesOf(result.connections)).toEqual(['A->B', 'B->Dst', 'Src->A']);
		});

		it('drops an empty group, which the old format cannot express', () => {
			const result = migrateGroupNodesToNodeGroups({
				nodes: [groupNode('g1', 'Empty')],
				connections: {},
			});

			expect(result.nodeGroups).toEqual([]);
			expect(result.droppedGroupIds).toEqual(['g1']);
		});

		it('drops a nested group but keeps its nodes and connections', () => {
			const nodes = [
				groupNode('g1', 'Outer'),
				groupNode('g2', 'Inner', '', 'g1'),
				member('Deep', 'g2'),
			];
			const result = migrateGroupNodesToNodeGroups({ nodes, connections: {} });

			expect(result.droppedGroupIds).toEqual(['g1', 'g2']);
			// The safe failure: the node survives, only its grouping is lost.
			expect(result.nodes.map((candidate) => candidate.name)).toEqual(['Deep']);
		});

		it('survives a full round trip for a group the old format can express', () => {
			const nodes = [node('Src'), node('A'), node('B'), node('Dst')];
			const connections = connect(['Src', 'A'], ['A', 'B'], ['B', 'Dst']);
			const nodeGroups = [group('g1', 'Group', ['a', 'b'], 'does a thing')];

			const forward = migrateNodeGroupsToGroupNodes({ nodes, connections, nodeGroups });
			const back = migrateGroupNodesToNodeGroups({
				nodes: forward.nodes,
				connections: forward.connections,
			});

			expect(back.nodeGroups).toEqual(nodeGroups);
			expect(edgesOf(back.connections)).toEqual(edgesOf(connections));
			expect(back.nodes.map((candidate) => candidate.name).sort()).toEqual([
				'A',
				'B',
				'Dst',
				'Src',
			]);
		});
	});
});
