import { GROUP_NODE_TYPE } from '../src/constants';
import { getGroupInteriors, validateGroupNodes } from '../src/group-node-validation';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type NodeConnectionType,
} from '../src/interfaces';

function node(name: string, parentId?: string, type = 'n8n-nodes-base.set'): INode {
	return {
		id: name.toLowerCase(),
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

function group(id: string, name = id, parentId?: string): INode {
	return { ...node(name, parentId, GROUP_NODE_TYPE), id };
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

function codes(result: ReturnType<typeof validateGroupNodes>): string[] {
	return result.valid ? [] : result.violations.map((violation) => violation.code);
}

describe('group node validation', () => {
	describe('the rules the group-node model removes', () => {
		it('accepts an interior with several entry nodes', () => {
			// The old model needed exactly one entry, because a member stood in as
			// the boundary. A group owns its ports, so any number is fine.
			const nodes = [group('g'), node('EntryA', 'g'), node('EntryB', 'g'), node('Src')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Src', 'g']),
			});

			expect(result.valid).toBe(true);
		});

		it('accepts an interior with several exit nodes', () => {
			const nodes = [group('g'), node('ExitA', 'g'), node('ExitB', 'g'), node('Dst')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['g', 'Dst']),
			});

			expect(result.valid).toBe(true);
		});

		it('accepts a trigger inside a group', () => {
			const nodes = [
				group('g'),
				node('Trigger', 'g', 'n8n-nodes-base.manualTrigger'),
				node('After', 'g'),
			];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Trigger', 'After']),
			});

			expect(result.valid).toBe(true);
		});

		it('accepts an empty group', () => {
			const result = validateGroupNodes({ nodes: [group('g')], connectionsBySourceNode: {} });

			expect(result.valid).toBe(true);
		});
	});

	describe('rule 1: the boundary', () => {
		it('accepts an interior node connected to a sibling', () => {
			const nodes = [group('g'), node('A', 'g'), node('B', 'g')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['A', 'B']),
			});

			expect(result.valid).toBe(true);
		});

		it("accepts an interior node connected to the group's own port", () => {
			const nodes = [group('g'), node('A', 'g'), node('Outside')];
			const result = validateGroupNodes({
				nodes,
				// The interior reaches the outside through the group node.
				connectionsBySourceNode: connect(['A', 'g'], ['g', 'Outside']),
			});

			expect(result.valid).toBe(true);
		});

		it('rejects an interior node connected straight to a node outside', () => {
			const nodes = [group('g'), node('Inside', 'g'), node('Outside')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Inside', 'Outside']),
			});

			expect(codes(result)).toEqual(['boundary-crossed']);
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.violations[0].message).toContain('connect to the group instead');
			}
		});

		it('rejects a node outside connected straight into the interior', () => {
			const nodes = [group('g'), node('Inside', 'g'), node('Outside')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Outside', 'Inside']),
			});

			expect(codes(result)).toEqual(['boundary-crossed']);
		});

		it('rejects an edge between two different groups’ interiors', () => {
			const nodes = [group('g1'), group('g2'), node('A', 'g1'), node('B', 'g2')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['A', 'B']),
			});

			expect(codes(result)).toEqual(['boundary-crossed']);
		});

		it('accepts two groups connected through their own ports', () => {
			const nodes = [group('g1'), group('g2'), node('A', 'g1'), node('B', 'g2')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['g1', 'g2']),
			});

			expect(result.valid).toBe(true);
		});

		it('accepts a group node nested in another group connected to its sibling', () => {
			// `g2` is an interior node of `g1`, so its edges belong to `g1`.
			const nodes = [group('g1'), group('g2', 'g2', 'g1'), node('Sibling', 'g1')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['g2', 'Sibling']),
			});

			expect(result.valid).toBe(true);
		});

		it('rejects a model connection that crosses the boundary', () => {
			const nodes = [group('g'), node('Agent', 'g'), node('Model')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Model', 'Agent', NodeConnectionTypes.AiLanguageModel]),
			});

			expect(codes(result)).toEqual(['non-main-boundary']);
			if (!result.valid) {
				expect(result.violations[0].message).toContain('cannot cross the');
			}
		});

		it('accepts a model connection inside one group', () => {
			const nodes = [group('g'), node('Agent', 'g'), node('Model', 'g')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Model', 'Agent', NodeConnectionTypes.AiLanguageModel]),
			});

			expect(result.valid).toBe(true);
		});
	});

	describe('rule 2: parentId names a group', () => {
		it('rejects a parentId that names no node', () => {
			const result = validateGroupNodes({ nodes: [node('A', 'missing')] });

			expect(codes(result)).toEqual(['unknown-parent']);
		});

		it('rejects a parentId that names a node which is not a group', () => {
			const nodes = [node('Plain'), node('A', 'plain')];
			const result = validateGroupNodes({ nodes });

			expect(codes(result)).toEqual(['parent-not-a-group']);
			if (!result.valid) {
				expect(result.violations[0].message).toContain('must name a group node');
			}
		});

		it('rejects an empty parentId', () => {
			const result = validateGroupNodes({ nodes: [node('A', '')] });

			// An empty string is not a group id.
			expect(codes(result)).toEqual(['invalid-parent-id']);
		});

		it('accepts a node with no parent', () => {
			const result = validateGroupNodes({ nodes: [node('A')] });

			expect(result.valid).toBe(true);
		});
	});

	describe('rule 3: the parent chain is acyclic', () => {
		it('rejects a group that is its own parent', () => {
			const result = validateGroupNodes({ nodes: [group('g', 'g', 'g')] });

			expect(codes(result)).toEqual(['parent-cycle']);
		});

		it('rejects a cycle through two groups', () => {
			const nodes = [group('g1', 'g1', 'g2'), group('g2', 'g2', 'g1')];
			const result = validateGroupNodes({ nodes });

			expect(result.valid).toBe(false);
			expect(codes(result)).toContain('parent-cycle');
		});

		it('accepts a chain of nested groups', () => {
			const nodes = [
				group('g1'),
				group('g2', 'g2', 'g1'),
				group('g3', 'g3', 'g2'),
				node('Deep', 'g3'),
			];
			const result = validateGroupNodes({ nodes });

			expect(result.valid).toBe(true);
		});
	});

	describe('rule 4: one innermost group per node', () => {
		it('holds by construction because parentId is one value', () => {
			const nodes = [group('g1'), group('g2'), node('A', 'g2')];
			const result = validateGroupNodes({ nodes });

			expect(result.valid).toBe(true);
			// The node is inside `g2` only; there is no way to name a second group.
			expect(nodes[2].parentId).toBe('g2');
		});
	});

	describe('interiors', () => {
		it('lists the interior of each group and leaves an empty group empty', () => {
			const nodes = [group('g1'), group('g2'), node('A', 'g1'), node('B', 'g1')];

			expect(getGroupInteriors(nodes)).toEqual(
				new Map([
					['g1', [nodes[2], nodes[3]]],
					['g2', []],
				]),
			);
		});
	});

	describe('degraded input', () => {
		it('runs the parent rules with no connections given', () => {
			const result = validateGroupNodes({ nodes: [node('A', 'missing')] });

			expect(codes(result)).toEqual(['unknown-parent']);
		});

		it('ignores an edge that names a node the workflow does not have', () => {
			const nodes = [group('g'), node('A', 'g')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['A', 'Ghost']),
			});

			expect(result.valid).toBe(true);
		});

		it('collects every violation, with the save-path error first', () => {
			const nodes = [group('g'), node('Inside', 'g'), node('Outside'), node('Orphan', 'missing')];
			const result = validateGroupNodes({
				nodes,
				connectionsBySourceNode: connect(['Inside', 'Outside']),
			});

			expect(codes(result)).toEqual(['unknown-parent', 'boundary-crossed']);
		});
	});
});
