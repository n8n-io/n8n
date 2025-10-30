import {
	getInputEdges,
	getOutputEdges,
	getRootNodes,
	getLeafNodes,
	parseExtractableSubgraphSelection,
	hasPath,
	buildAdjacencyList,
} from '../../src/graph/graph-utils';
import type { IConnection, IConnections, NodeConnectionType } from '../../src/index';

function makeConnection(
	node: string,
	index: number = 0,
	type: NodeConnectionType = 'main',
): IConnection {
	return {
		node,
		index,
		type,
	};
}

describe('graphUtils', () => {
	describe('getInputEdges', () => {
		it('should return edges leading into the graph', () => {
			const graphIds = new Set(['B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
			]);

			const result = getInputEdges(graphIds, adjacencyList);
			expect(result).toEqual([['A', makeConnection('B')]]);
		});

		it('should return an empty array if there are no input edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set()],
			]);

			const result = getInputEdges(graphIds, adjacencyList);
			expect(result).toEqual([]);
		});
	});

	describe('getOutputEdges', () => {
		it('should return edges leading out of the graph', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set()],
			]);

			const result = getOutputEdges(graphIds, adjacencyList);
			expect(result).toEqual([['B', makeConnection('C')]]);
		});

		it('should return an empty array if there are no output edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
			]);

			const result = getOutputEdges(graphIds, adjacencyList);
			expect(result).toEqual([]);
		});
	});

	describe('getRootNodes', () => {
		it('should return root nodes of the graph', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
			]);

			const result = getRootNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['A', 'C']));
		});

		it('should return all nodes if there are no incoming edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>();

			const result = getRootNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['A', 'B']));
		});
	});

	describe('getLeafNodes', () => {
		it('should return leaf nodes of the graph', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set()],
			]);

			const result = getLeafNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['C']));
		});

		it('should return all nodes if there are no outgoing edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set()],
				['B', new Set()],
			]);

			const result = getLeafNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['A', 'B']));
		});
	});

	describe('parseExtractableSubgraphSelection', () => {
		it('should return successfully for a valid extractable subgraph', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['C', new Set([makeConnection('A')])],
				['A', new Set([makeConnection('B')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'A', end: undefined });
		});

		it('should return successfully for multiple edges into single input node', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['X', new Set([makeConnection('A')])],
				['Y', new Set([makeConnection('A')])],
				['A', new Set([makeConnection('B')])],
				['B', new Set()],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'A', end: undefined });
		});

		it('should return successfully for multiple edges from single output nodes', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('X'), makeConnection('Y')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: undefined, end: 'B' });
		});

		it('should return errors for input edge to non-root node', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['X', new Set([makeConnection('B')])],
				['A', new Set([makeConnection('B')])],
				['B', new Set()],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{
					errorCode: 'Input Edge To Non-Root Node',
					node: 'B',
				},
			]);
		});

		it('should return errors for output edge from non-leaf node', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B'), makeConnection('X')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{
					errorCode: 'Output Edge From Non-Leaf Node',
					node: 'A',
				},
			]);
		});

		it('should return successfully for multiple root nodes with 1 input', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('C')])],
				['B', new Set([makeConnection('C')])],
				['X', new Set([makeConnection('A')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'A', end: undefined });
		});

		it('should return an error for multiple root nodes with inputs', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('C')])],
				['B', new Set([makeConnection('C')])],
				['X', new Set([makeConnection('A')])],
				['Y', new Set([makeConnection('B')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{
					errorCode: 'Multiple Input Nodes',
					nodes: new Set(['A', 'B']),
				},
			]);
		});

		it('should return successfully for multiple leaf nodes with 1 output', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B'), makeConnection('C')])],
				['C', new Set([makeConnection('X')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: undefined, end: 'C' });
		});

		it('should return an error for multiple leaf nodes with outputs', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B'), makeConnection('C')])],
				['B', new Set([makeConnection('X')])],
				['C', new Set([makeConnection('X')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{
					errorCode: 'Multiple Output Nodes',
					nodes: new Set(['B', 'C']),
				},
			]);
		});

		it('should return an error for a non-continuous selection', () => {
			const graphIds = new Set(['A', 'D']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('D')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{
					errorCode: 'No Continuous Path From Root To Leaf In Selection',
					start: 'D',
					end: 'A',
				},
			]);
		});

		it('should allow loop with node itself', () => {
			const graphIds = new Set(['A']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('A')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: undefined, end: undefined });
		});
		it('should allow loop with node itself with input and output', () => {
			const graphIds = new Set(['B']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('B'), makeConnection('C')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'B', end: 'B' });
		});
		it('should allow loop within selection', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('A')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: undefined, end: undefined });
		});
		it('should allow loop within selection with input', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('A')])],
				['D', new Set([makeConnection('B')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'B', end: undefined });
		});
		it('should allow loop within selection with two inputs', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('A')])],
				['D', new Set([makeConnection('B')])],
				['E', new Set([makeConnection('B')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual({ start: 'B', end: undefined });
		});
		it('should not allow loop within selection with inputs to different nodes', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('A')])],
				['D', new Set([makeConnection('B')])],
				['E', new Set([makeConnection('C')])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toEqual([
				{ errorCode: 'Input Edge To Non-Root Node', node: 'B' },
				{ errorCode: 'Input Edge To Non-Root Node', node: 'C' },
			]);
		});
	});
	describe('hasPath', () => {
		it('should return true for a direct path between start and end', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
			]);

			const result = hasPath('A', 'C', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false if there is no path between start and end', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['C', new Set([makeConnection('D')])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a path with multiple intermediate nodes', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('D')])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false if the start node is not in the adjacency list', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('D')])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return false if the end node is not in the adjacency list', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a cyclic graph where a path exists', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('C')])],
				['C', new Set([makeConnection('A')])],
			]);

			const result = hasPath('A', 'C', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false for a cyclic graph where no path exists', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('B')])],
				['B', new Set([makeConnection('A')])],
				['C', new Set([makeConnection('D')])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a self-loop', () => {
			const adjacencyList = new Map<string, Set<IConnection>>([
				['A', new Set([makeConnection('A')])],
			]);

			const result = hasPath('A', 'A', adjacencyList);
			expect(result).toBe(true);
		});
	});
	describe('buildAdjacencyList', () => {
		it('should build an adjacency list from connections by source node', () => {
			const connectionsBySourceNode: IConnections = {
				A: {
					main: [
						[
							{ node: 'B', index: 0, type: 'main' },
							{ node: 'C', index: 1, type: 'main' },
						],
					],
				},
				B: {
					main: [[{ node: 'D', index: 0, type: 'main' }]],
				},
			};

			const result = buildAdjacencyList(connectionsBySourceNode);

			expect(result).toEqual(
				new Map<string, Set<IConnection>>([
					['A', new Set([makeConnection('B', 0), makeConnection('C', 1)])],
					['B', new Set([makeConnection('D', 0)])],
				]),
			);
		});

		it('should handle an empty connections object', () => {
			const connectionsBySourceNode = {};

			const result = buildAdjacencyList(connectionsBySourceNode);

			expect(result).toEqual(new Map());
		});

		it('should handle connections with multiple types', () => {
			const connectionsBySourceNode: IConnections = {
				A: {
					main: [[{ node: 'B', index: 0, type: 'main' }]],
					ai_tool: [[{ node: 'C', index: 1, type: 'ai_tool' }]],
				},
			};

			const result = buildAdjacencyList(connectionsBySourceNode);

			expect(result).toEqual(
				new Map<string, Set<IConnection>>([
					['A', new Set([makeConnection('B', 0, 'main'), makeConnection('C', 1, 'ai_tool')])],
				]),
			);
		});

		it('should handle connections with multiple indices', () => {
			const connectionsBySourceNode: IConnections = {
				A: {
					main: [[{ node: 'B', index: 0, type: 'main' }], [{ node: 'C', index: 1, type: 'main' }]],
				},
			};

			const result = buildAdjacencyList(connectionsBySourceNode);

			expect(result).toEqual(
				new Map<string, Set<IConnection>>([
					['A', new Set([makeConnection('B', 0), makeConnection('C', 1)])],
				]),
			);
		});
	});
});
