import { getChildNodes } from '../src/common/get-child-nodes';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

describe('getChildNodes', () => {
	const linearMainChain: IConnections = {
		A: {
			[NodeConnectionTypes.Main]: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		B: {
			[NodeConnectionTypes.Main]: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]],
		},
		C: {
			[NodeConnectionTypes.Main]: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]],
		},
	};

	it('uses NodeConnectionTypes.Main as the default type', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }]],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root');

		expect(result).toEqual(['MainChild']);
	});

	it('uses unlimited depth (-1) by default and traverses the full chain', () => {
		const result = getChildNodes(linearMainChain, 'A');

		expect(result).toEqual(['D', 'C', 'B']);
	});

	it('respects an explicit depth of 1 and returns only direct children', () => {
		const result = getChildNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 1);

		expect(result).toEqual(['B']);
	});

	it('returns an empty array when depth is 0', () => {
		const result = getChildNodes(linearMainChain, 'A', NodeConnectionTypes.Main, 0);

		expect(result).toEqual([]);
	});

	it('returns an empty array when the source node has no outgoing connections', () => {
		const result = getChildNodes(linearMainChain, 'NodeWithNoOutputs');

		expect(result).toEqual([]);
	});

	it('filters by an explicit non-main connection type', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }]],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', NodeConnectionTypes.AiTool);

		expect(result).toEqual(['ToolChild']);
	});

	it('returns children across all types when type is "ALL"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }]],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', 'ALL');

		expect(result).toEqual(expect.arrayContaining(['MainChild', 'ToolChild']));
		expect(result).toHaveLength(2);
	});

	it('returns only non-main children when type is "ALL_NON_MAIN"', () => {
		const mixedTypes: IConnections = {
			Root: {
				[NodeConnectionTypes.Main]: [[{ node: 'MainChild', type: NodeConnectionTypes.Main, index: 0 }]],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'ToolChild', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		};

		const result = getChildNodes(mixedTypes, 'Root', 'ALL_NON_MAIN');

		expect(result).toEqual(['ToolChild']);
	});
});
