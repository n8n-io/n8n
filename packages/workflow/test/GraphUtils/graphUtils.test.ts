import {
	getInputEdges,
	getOutputEdges,
	getRootNodes,
	getLeafNodes,
	parseExtractableSubgraphSelection,
	hasPath,
} from '../../src/Graph/graphUtils';

describe('graphUtils', () => {
	describe('getInputEdges', () => {
		it('should return edges leading into the graph', () => {
			const graphIds = new Set(['B', 'C']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
			]);

			const result = getInputEdges(graphIds, adjacencyList);
			expect(result).toEqual([['A', 'B']]);
		});

		it('should return an empty array if there are no input edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set()],
			]);

			const result = getInputEdges(graphIds, adjacencyList);
			expect(result).toEqual([]);
		});
	});

	describe('getOutputEdges', () => {
		it('should return edges leading out of the graph', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
				['C', new Set()],
			]);

			const result = getOutputEdges(graphIds, adjacencyList);
			expect(result).toEqual([['B', 'C']]);
		});

		it('should return an empty array if there are no output edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([['A', new Set(['B'])]]);

			const result = getOutputEdges(graphIds, adjacencyList);
			expect(result).toEqual([]);
		});
	});

	describe('getRootNodes', () => {
		it('should return root nodes of the graph', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<string>>([['A', new Set(['B'])]]);

			const result = getRootNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['A', 'C']));
		});

		it('should return all nodes if there are no incoming edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>();

			const result = getRootNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['A', 'B']));
		});
	});

	describe('getLeafNodes', () => {
		it('should return leaf nodes of the graph', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
				['C', new Set()],
			]);

			const result = getLeafNodes(graphIds, adjacencyList);
			expect(result).toEqual(new Set(['C']));
		});

		it('should return all nodes if there are no outgoing edges', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
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
			const adjacencyList = new Map<string, Set<string>>([
				['C', new Set(['A'])],
				['A', new Set(['B'])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toMatchObject({ start: 'A' });
		});

		it('should return successfully for multiple edges into single input node', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
				['X', new Set(['A'])],
				['Y', new Set(['A'])],
				['A', new Set(['B'])],
				['B', new Set()],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toMatchObject({ start: 'A' });
		});

		it('should return successfully for multiple edges from single output nodes', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['X', 'Y'])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toMatchObject({});
		});

		it('should return errors for input edge to non-root node', () => {
			const graphIds = new Set(['A', 'B']);
			const adjacencyList = new Map<string, Set<string>>([
				['X', new Set(['B'])],
				['A', new Set(['B'])],
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
			const adjacencyList = new Map<string, Set<string>>([['A', new Set(['B', 'X'])]]);

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
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['C'])],
				['B', new Set(['C'])],
				['X', new Set(['A'])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toMatchObject({});
		});

		it('should return an error for multiple root nodes with inputs', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['C'])],
				['B', new Set(['C'])],
				['X', new Set(['A'])],
				['Y', new Set(['B'])],
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
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B', 'C'])],
				['C', new Set(['X'])],
			]);

			const result = parseExtractableSubgraphSelection(graphIds, adjacencyList);
			expect(result).toMatchObject({});
		});

		it('should return an error for multiple leaf nodes with outputs', () => {
			const graphIds = new Set(['A', 'B', 'C']);
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B', 'C'])],
				['B', new Set(['X'])],
				['C', new Set(['X'])],
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
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
				['C', new Set(['D'])],
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
	});
	describe('hasPath', () => {
		it('should return true for a direct path between start and end', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
			]);

			const result = hasPath('A', 'C', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false if there is no path between start and end', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['C', new Set(['D'])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a path with multiple intermediate nodes', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
				['C', new Set(['D'])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false if the start node is not in the adjacency list', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['B', new Set(['C'])],
				['C', new Set(['D'])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return false if the end node is not in the adjacency list', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a cyclic graph where a path exists', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['C'])],
				['C', new Set(['A'])],
			]);

			const result = hasPath('A', 'C', adjacencyList);
			expect(result).toBe(true);
		});

		it('should return false for a cyclic graph where no path exists', () => {
			const adjacencyList = new Map<string, Set<string>>([
				['A', new Set(['B'])],
				['B', new Set(['A'])],
				['C', new Set(['D'])],
			]);

			const result = hasPath('A', 'D', adjacencyList);
			expect(result).toBe(false);
		});

		it('should return true for a self-loop', () => {
			const adjacencyList = new Map<string, Set<string>>([['A', new Set(['A'])]]);

			const result = hasPath('A', 'A', adjacencyList);
			expect(result).toBe(true);
		});
	});
});
