import { findAiRootNodeNames } from '../src/common';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

describe('findAiRootNodeNames', () => {
	describe('invalid / non-object input', () => {
		test.each([
			['undefined', undefined],
			['null', null],
			['number', 42],
			['string', 'connections'],
			['boolean', true],
		])('returns an empty Set for %s', (_label, input) => {
			const result = findAiRootNodeNames(input);
			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(0);
		});

		it('returns an empty Set for an empty array (typeof [] === "object", but Object.values is empty)', () => {
			expect(findAiRootNodeNames([])).toEqual(new Set());
		});
	});

	describe('empty / well-formed but empty inputs', () => {
		it('returns an empty Set for an empty connections object', () => {
			expect(findAiRootNodeNames({})).toEqual(new Set());
		});

		it('skips source nodes whose value is not an object', () => {
			const connections = {
				A: null,
				B: undefined,
				C: 'not-an-object',
				D: 7,
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		it('returns an empty Set when no ai_* connection types are present', () => {
			const connections: IConnections = {
				Source: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});
	});

	describe('ai_* connection prefix gating', () => {
		it('collects targets from ai_* connection types', () => {
			const connections: IConnections = {
				Tool: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Agent']));
		});

		test.each([
			NodeConnectionTypes.AiAgent,
			NodeConnectionTypes.AiChain,
			NodeConnectionTypes.AiDocument,
			NodeConnectionTypes.AiEmbedding,
			NodeConnectionTypes.AiLanguageModel,
			NodeConnectionTypes.AiMemory,
			NodeConnectionTypes.AiOutputParser,
			NodeConnectionTypes.AiRetriever,
			NodeConnectionTypes.AiReranker,
			NodeConnectionTypes.AiTextSplitter,
			NodeConnectionTypes.AiTool,
			NodeConnectionTypes.AiVectorStore,
		])('collects targets from %s connections', (connType) => {
			const connections = {
				Source: {
					[connType]: [[{ node: 'Root', type: connType, index: 0 }]],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Root']));
		});

		it('does NOT collect from main connections', () => {
			const connections: IConnections = {
				Source: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'NotARoot', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		test.each([
			['ai (no underscore)', 'ai'],
			['aix (different prefix)', 'aix_tool'],
			['AI_ (uppercase)', 'AI_TOOL'],
			['main', 'main'],
			['arbitrary', 'custom'],
			['empty string', ''],
		])('does NOT collect from connection type "%s"', (_label, connType) => {
			const connections = {
				Source: {
					[connType]: [[{ node: 'Leaked', type: connType, index: 0 }]],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		it('only includes targets from ai_* types when mixed with main', () => {
			const connections: IConnections = {
				Source: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'MainTarget', type: NodeConnectionTypes.Main, index: 0 }],
					],
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'AiTarget', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['AiTarget']));
		});
	});

	describe('structural validation of outputs / groups / conns', () => {
		it('skips ai_* entries whose outputs value is not an array', () => {
			const connections = {
				Source: {
					ai_tool: { node: 'X' } as unknown as Array<unknown>,
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		it('skips groups inside outputs that are not arrays (e.g. null)', () => {
			const connections = {
				Source: {
					ai_tool: [
						null,
						[{ node: 'Kept', type: 'ai_tool', index: 0 }],
					] as unknown as Array<unknown>,
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Kept']));
		});

		it('skips conn items that are not objects', () => {
			const connections = {
				Source: {
					ai_tool: [['not-an-object', null, 42, undefined]],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		it('skips conn items where node is not a string', () => {
			const connections = {
				Source: {
					ai_tool: [
						[
							{ node: 123, type: 'ai_tool', index: 0 },
							{ node: null, type: 'ai_tool', index: 0 },
							{ type: 'ai_tool', index: 0 }, // missing node
							{ node: { nested: 'x' }, type: 'ai_tool', index: 0 },
						],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set());
		});

		it('keeps valid conns and drops invalid ones within the same group', () => {
			const connections = {
				Source: {
					ai_tool: [
						[
							{ node: 'Good', type: 'ai_tool', index: 0 },
							{ node: 99, type: 'ai_tool', index: 0 },
							null,
							{ type: 'ai_tool', index: 0 },
							{ node: 'AlsoGood', type: 'ai_tool', index: 0 },
						],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Good', 'AlsoGood']));
		});

		it('keeps an empty-string node name (string typeof is the gate, not truthiness)', () => {
			const connections = {
				Source: {
					ai_tool: [[{ node: '', type: 'ai_tool', index: 0 }]],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['']));
		});
	});

	describe('aggregation across source nodes / groups / types', () => {
		it('collects across multiple ai_* groups within one source', () => {
			const connections: IConnections = {
				Source: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'AgentA', type: NodeConnectionTypes.AiTool, index: 0 }],
						[{ node: 'AgentB', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['AgentA', 'AgentB']));
		});

		it('collects from multiple source nodes', () => {
			const connections: IConnections = {
				ToolA: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent1', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				ToolB: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent2', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Agent1', 'Agent2']));
		});

		it('collects from multiple ai_* connection types', () => {
			const connections: IConnections = {
				LLM: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
				Memory: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'Chain', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['Agent', 'Chain']));
		});

		it('deduplicates: the same root reached via multiple paths appears once', () => {
			const connections: IConnections = {
				ToolA: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				ToolB: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				LLM: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			};
			const result = findAiRootNodeNames(connections);
			expect(result).toEqual(new Set(['Agent']));
			expect(result.size).toBe(1);
		});

		it('returns names taken from conn.node, not from the source-node key', () => {
			// The function returns *targets* (roots), not sources. The source
			// key 'Tool' must NOT leak into the result.
			const connections: IConnections = {
				Tool: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			const result = findAiRootNodeNames(connections);
			expect(result.has('Agent')).toBe(true);
			expect(result.has('Tool')).toBe(false);
		});

		it('returns names taken from conn.node, not from conn.type', () => {
			// Stryker-style sanity: assert the function reads `.node`, not
			// some other property that happens to be present.
			const connections = {
				Source: {
					ai_tool: [[{ node: 'TheNode', type: 'NotTheNode' as never, index: 0 }]],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(new Set(['TheNode']));
		});
	});

	describe('invariants', () => {
		const baseline: IConnections = {
			Tool1: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			Tool2: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Chain', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			LLM: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		};

		it('result is always a Set<string> instance', () => {
			expect(findAiRootNodeNames(baseline)).toBeInstanceOf(Set);
			expect(findAiRootNodeNames(null)).toBeInstanceOf(Set);
			expect(findAiRootNodeNames({})).toBeInstanceOf(Set);
		});

		it('every returned name appears as conn.node in some ai_* group of the input', () => {
			const result = findAiRootNodeNames(baseline);
			const collectedFromInput = new Set<string>();
			for (const sourceConns of Object.values(baseline)) {
				for (const [connType, outputs] of Object.entries(sourceConns)) {
					if (!connType.startsWith('ai_')) continue;
					for (const group of outputs as Array<Array<{ node: string }>>) {
						for (const conn of group) collectedFromInput.add(conn.node);
					}
				}
			}
			for (const name of result) {
				expect(collectedFromInput.has(name)).toBe(true);
			}
		});

		it('is invariant under reordering of source-node keys', () => {
			const reordered: IConnections = {
				LLM: baseline.LLM,
				Tool2: baseline.Tool2,
				Tool1: baseline.Tool1,
			};
			expect(findAiRootNodeNames(reordered)).toEqual(findAiRootNodeNames(baseline));
		});

		it('is invariant under reordering of connection-type keys within a source', () => {
			const both: IConnections = {
				Mixed: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
					[NodeConnectionTypes.AiMemory]: [
						[{ node: 'Chain', type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
			};
			const reordered: IConnections = {
				Mixed: {
					[NodeConnectionTypes.AiMemory]: both.Mixed[NodeConnectionTypes.AiMemory],
					[NodeConnectionTypes.AiTool]: both.Mixed[NodeConnectionTypes.AiTool],
				},
			};
			expect(findAiRootNodeNames(reordered)).toEqual(findAiRootNodeNames(both));
		});

		it('is invariant under reordering of conns within a group (Set semantics)', () => {
			const connections = {
				Source: {
					ai_tool: [
						[
							{ node: 'A', type: 'ai_tool', index: 0 },
							{ node: 'B', type: 'ai_tool', index: 0 },
							{ node: 'C', type: 'ai_tool', index: 0 },
						],
					],
				},
			};
			const reversed = {
				Source: {
					ai_tool: [
						[
							{ node: 'C', type: 'ai_tool', index: 0 },
							{ node: 'B', type: 'ai_tool', index: 0 },
							{ node: 'A', type: 'ai_tool', index: 0 },
						],
					],
				},
			};
			expect(findAiRootNodeNames(connections)).toEqual(findAiRootNodeNames(reversed));
		});

		it('adding a non-ai_* connection does not change the result', () => {
			const augmented: IConnections = {
				...baseline,
				ExtraSource: {
					[NodeConnectionTypes.Main]: [
						[{ node: 'MainOnly', type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(augmented)).toEqual(findAiRootNodeNames(baseline));
		});

		it('adding a duplicate ai_* conn does not change the result (Set dedup)', () => {
			const augmented: IConnections = {
				...baseline,
				DupTool: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			};
			expect(findAiRootNodeNames(augmented)).toEqual(findAiRootNodeNames(baseline));
		});
	});
});
