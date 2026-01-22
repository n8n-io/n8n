import { mock } from 'vitest-mock-extended';

import {
	type IConnections,
	type INode,
	type INodeParameters,
	type IWorkflowBase,
	type NodeParameterValue,
} from '../src';
import {
	compareNodes,
	compareWorkflowsNodes,
	determineNodeSize,
	groupWorkflows,
	hasCredentialChanges,
	hasNonPositionalChanges,
	NodeDiffStatus,
	RULES,
	SKIP_RULES,
	stringContainsParts,
	WorkflowChangeSet,
	type DiffableNode,
	type DiffableWorkflow,
	type DiffMetaData,
	type DiffRule,
} from '../src/workflow-diff';

describe('NodeDiffStatus', () => {
	it('should have correct enum values', () => {
		expect(NodeDiffStatus.Eq).toBe('equal');
		expect(NodeDiffStatus.Modified).toBe('modified');
		expect(NodeDiffStatus.Added).toBe('added');
		expect(NodeDiffStatus.Deleted).toBe('deleted');
	});
});

describe('compareNodes', () => {
	const createTestNode = (overrides: Partial<TestNode> = {}): TestNode => ({
		id: 'test-node-1',
		name: 'Test Node',
		type: 'test-type',
		typeVersion: 1,
		webhookId: 'webhook-123',
		credentials: { test: 'credential' },
		parameters: { param1: 'value1' },
		position: [100, 200],
		disabled: false,
		...overrides,
	});

	type TestNode = {
		id: string;
		name: string;
		type: string;
		typeVersion: number;
		webhookId: string;
		credentials: Record<string, unknown>;
		parameters: INodeParameters;
		position: [number, number];
		disabled: boolean;
	};

	it('should return true for identical nodes', () => {
		const node1 = createTestNode();
		const node2 = createTestNode();

		const result = compareNodes(node1, node2);

		expect(result).toBe(true);
	});

	it('should return false when nodes have different names', () => {
		const node1 = createTestNode({ name: 'Node 1' });
		const node2 = createTestNode({ name: 'Node 2' });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should return false when nodes have different types', () => {
		const node1 = createTestNode({ type: 'type1' });
		const node2 = createTestNode({ type: 'type2' });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should return false when nodes have different typeVersions', () => {
		const node1 = createTestNode({ typeVersion: 1 });
		const node2 = createTestNode({ typeVersion: 2 });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should return false when nodes have different webhookIds', () => {
		const node1 = createTestNode({ webhookId: 'webhook1' });
		const node2 = createTestNode({ webhookId: 'webhook2' });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should return false when nodes have different credentials', () => {
		const node1 = createTestNode({ credentials: { test: 'cred1' } });
		const node2 = createTestNode({ credentials: { test: 'cred2' } });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should return false when nodes have different parameters', () => {
		const node1 = createTestNode({ parameters: { param1: 'value1' } });
		const node2 = createTestNode({ parameters: { param1: 'value2' } });

		const result = compareNodes(node1, node2);

		expect(result).toBe(false);
	});

	it('should ignore properties not in comparison list', () => {
		const node1 = createTestNode({ position: [100, 200], disabled: false });
		const node2 = createTestNode({ position: [300, 400], disabled: true });

		const result = compareNodes(node1, node2);

		expect(result).toBe(true);
	});

	it('should handle undefined base node', () => {
		const node2 = createTestNode();

		const result = compareNodes(undefined, node2);

		expect(result).toBe(false);
	});

	it('should handle undefined target node', () => {
		const node1 = createTestNode();

		const result = compareNodes(node1, undefined);

		expect(result).toBe(false);
	});

	it('should handle both nodes being undefined', () => {
		const result = compareNodes(undefined, undefined);

		expect(result).toBe(true);
	});
});

describe('compareWorkflowsNodes', () => {
	const createTestNode = (id: string, overrides: Partial<TestNode> = {}): TestNode => ({
		id,
		name: `Node ${id}`,
		type: 'test-type',
		typeVersion: 1,
		webhookId: `webhook-${id}`,
		credentials: {},
		parameters: {},
		...overrides,
	});

	type TestNode = {
		id: string;
		name: string;
		type: string;
		typeVersion: number;
		webhookId: string;
		credentials: Record<string, unknown>;
		parameters: INodeParameters;
	};

	it('should detect equal nodes', () => {
		const baseNodes = [createTestNode('1'), createTestNode('2')];
		const targetNodes = [createTestNode('1'), createTestNode('2')];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(2);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Eq);
	});

	it('should detect modified nodes', () => {
		const baseNodes = [createTestNode('1', { name: 'Original Name' })];
		const targetNodes = [createTestNode('1', { name: 'Modified Name' })];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(1);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Modified);
		expect(diff.get('1')?.node).toEqual(baseNodes[0]);
	});

	it('should detect added nodes', () => {
		const baseNodes = [createTestNode('1')];
		const targetNodes = [createTestNode('1'), createTestNode('2')];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(2);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Added);
		expect(diff.get('2')?.node).toEqual(targetNodes[1]);
	});

	it('should detect deleted nodes', () => {
		const baseNodes = [createTestNode('1'), createTestNode('2')];
		const targetNodes = [createTestNode('1')];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(2);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Deleted);
		expect(diff.get('2')?.node).toEqual(baseNodes[1]);
	});

	it('should handle empty base array', () => {
		const baseNodes: TestNode[] = [];
		const targetNodes = [createTestNode('1'), createTestNode('2')];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(2);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Added);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Added);
	});

	it('should handle empty target array', () => {
		const baseNodes = [createTestNode('1'), createTestNode('2')];
		const targetNodes: TestNode[] = [];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(2);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Deleted);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Deleted);
	});

	it('should handle both arrays being empty', () => {
		const baseNodes: TestNode[] = [];
		const targetNodes: TestNode[] = [];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(0);
	});

	it('should use custom comparison function when provided', () => {
		const baseNodes = [createTestNode('1', { name: 'Original' })];
		const targetNodes = [createTestNode('1', { name: 'Modified' })];

		const customCompare = vi.fn().mockReturnValue(true);
		const diff = compareWorkflowsNodes(baseNodes, targetNodes, customCompare);

		expect(customCompare).toHaveBeenCalledWith(baseNodes[0], targetNodes[0]);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
	});

	it('should handle complex workflow comparison', () => {
		const baseNodes = [
			createTestNode('1', { name: 'Node 1' }),
			createTestNode('2', { name: 'Node 2' }),
			createTestNode('3', { name: 'Node 3' }),
		];
		const targetNodes = [
			createTestNode('1', { name: 'Node 1' }), // Equal
			createTestNode('2', { name: 'Node 2 Modified' }), // Modified
			createTestNode('4', { name: 'Node 4' }), // Added
		];

		const diff = compareWorkflowsNodes(baseNodes, targetNodes);

		expect(diff.size).toBe(4);
		expect(diff.get('1')?.status).toBe(NodeDiffStatus.Eq);
		expect(diff.get('2')?.status).toBe(NodeDiffStatus.Modified);
		expect(diff.get('3')?.status).toBe(NodeDiffStatus.Deleted);
		expect(diff.get('4')?.status).toBe(NodeDiffStatus.Added);
	});
});

describe('determineNodeSize', () => {
	it('should return 1 for an empty parameters object', () => {
		const parameters = {};
		const result = determineNodeSize(parameters);
		expect(result).toBe(1);
	});

	it('should return 1 for an empty parameters array', () => {
		const parameters: NodeParameterValue[] = [];
		const result = determineNodeSize(parameters);
		expect(result).toBe(1);
	});

	it('should return the length of a single string parameter', () => {
		const parameters = { param1: 'value1' };
		const result = determineNodeSize(parameters);
		expect(result).toBe(7);
	});

	it('should return the sum of lengths of multiple string parameters', () => {
		const parameters = { param1: 'value1', param2: 'value2' };
		const result = determineNodeSize(parameters);
		expect(result).toBe(13);
	});

	it('should count non-string values as 1', () => {
		const parameters = { param1: 42, param2: true, param3: null };
		const result = determineNodeSize(parameters);
		expect(result).toBe(4);
	});

	it('should handle nested objects', () => {
		const parameters = {
			param1: {
				nested1: 'value1',
				nested2: 'value2',
			},
		};
		const result = determineNodeSize(parameters);
		expect(result).toBe(14);
	});

	it('should handle arrays of strings', () => {
		const parameters = { param1: ['value1', 'value2'] };
		const result = determineNodeSize(parameters);
		expect(result).toBe(14);
	});

	it('should handle arrays of mixed types', () => {
		const parameters = { param1: ['value1', 42, true] };
		const result = determineNodeSize(parameters);
		expect(result).toBe(10);
	});

	it('should handle deeply nested structures', () => {
		const parameters = {
			param1: {
				nested1: {
					deepNested1: 'value1',
					deepNested2: ['value2', { deeperNested: 'value3' }],
				},
			},
		} as INodeParameters;
		const result = determineNodeSize(parameters);
		expect(result).toBe(23);
	});

	it('should handle empty arrays and objects', () => {
		const parameters = {
			param1: [],
			param2: {},
		};
		const result = determineNodeSize(parameters);
		expect(result).toBe(3);
	});

	it('should handle a mix of strings, objects, and arrays', () => {
		const parameters = {
			param1: 'value1',
			param2: {
				nested1: 'value2',
				nested2: ['value3', 'value4'],
			},
			param3: [42, 'value5'],
		};
		const result = determineNodeSize(parameters);
		expect(result).toBe(35);
	});
});

describe('groupWorkflows', () => {
	const node1 = mock<DiffableNode>({ id: '1', parameters: { a: 1 } });
	const node2 = mock<DiffableNode>({ id: '2', parameters: { a: 2 } });

	let rules: DiffRule[] = [];
	let workflows: IWorkflowBase[];
	beforeEach(() => {
		rules = [];
		workflows = [];
	});
	describe('basic grouping', () => {
		it('should not merge workflows without rule', () => {
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1, node2] },
			]);
			const { removed, remaining } = groupWorkflows(workflows, []);

			expect(remaining.length).toBe(2);
			expect(removed.length).toBe(0);
		});

		it('should group workflows with true rule', () => {
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
			]);

			const { removed, remaining } = groupWorkflows(workflows, [() => true]);

			expect(removed.length).toBe(1);
			expect(remaining.length).toBe(1);
			expect(removed[0]).toBe(workflows[0]);
			expect(remaining[0]).toBe(workflows[1]);
		});

		it('should handle multiple workflows when always merging', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [] },
				{ id: '1', nodes: [node1, node2] },
			]);

			const { removed, remaining } = groupWorkflows(workflows, [() => true]);

			expect(removed.length).toBe(4);
			expect(remaining.length).toBe(1);
		});

		it('should handle multiple workflows when sometimes merging', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', versionId: '1', nodes: [node1] },
				{ id: '1', versionId: '2', nodes: [node1, node2] },
				{ id: '1', versionId: '3', nodes: [node1] },
				{ id: '1', versionId: '4', nodes: [] },
				{ id: '1', versionId: '5', nodes: [node1, node2] },
			]);

			const { removed, remaining } = groupWorkflows(
				workflows,
				[() => true],
				[(prev, _next) => ['2', '4'].includes(prev.versionId ?? '')],
			);

			expect(removed.length).toBe(2);
			expect(remaining.length).toBe(3);
			expect(remaining).toEqual([workflows[1], workflows[3], workflows[4]]);
			expect(removed).toEqual(expect.arrayContaining([workflows[2], workflows[0]]));
		});

		it('should handle empty workflows array', () => {
			const { remaining, removed } = groupWorkflows(workflows, rules, []);

			expect(remaining.length).toBe(0);
			expect(removed.length).toBe(0);
		});

		it('should handle single workflow', () => {
			const workflows = mock<IWorkflowBase[]>([{ id: '1', nodes: [node1] }]);

			const { removed, remaining } = groupWorkflows(workflows, rules, []);

			expect(removed.length).toBe(0);
			expect(remaining.length).toBe(1);
		});
	});
	describe('rules', () => {
		describe('mergeAdditiveChanges', () => {
			const createWorkflow = (id: string, nodes: DiffableNode[]): IWorkflowBase => {
				return {
					id,
					nodes,
					connections: {},
					createdAt: new Date(),
				} as IWorkflowBase;
			};

			test.each([
				{
					description: 'should return true when all changes are additive',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					expected: true,
				},
				{
					description: 'should return false if a new parameter is added',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'value1', b: 'value2' }, name: 'n1' },
					]),
					expected: false,
				},
				{
					description: 'should return false when a node is deleted',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', []),
					expected: false,
				},
				{
					description: 'should return false when a node is modified non-additively',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'differentValue' }, name: 'n1' },
					]),
					expected: false,
				},
				{
					description: 'should return true when a node is added',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'value1' }, name: 'n1' },
						{ id: '2', parameters: { b: 'value2' }, name: 'n1' },
					]),
					expected: true,
				},
				{
					description: 'should return false when a node is modified and loses data',
					baseWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'value1', b: 'value2' }, name: 'n1' },
					]),
					nextWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					expected: false,
				},
				{
					description: 'should handle empty workflows',
					baseWorkflow: createWorkflow('1', []),
					nextWorkflow: createWorkflow('1', []),
					expected: true,
				},
				{
					description: 'should handle nested node',
					baseWorkflow: createWorkflow('1', [
						{
							id: '1',
							parameters: {
								conditions: {
									combinator: 'and',
									conditions: [
										{
											id: 'a561e9ba-ec13-4280-813c-28439d2e57df',
											leftValue: '={{ $json.da',
											operator: {
												name: 'filter.operator.equals',
												operation: 'equals',
												type: 'string',
											},
											rightValue: '',
										},
									],
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
										version: 3,
									},
								},
								options: {},
							},
							name: 'n1',
						},
					]),
					nextWorkflow: createWorkflow('1', [
						{
							id: '1',
							parameters: {
								conditions: {
									combinator: 'and',
									conditions: [
										{
											id: 'a561e9ba-ec13-4280-813c-28439d2e57df',
											leftValue: '={{ $json.dayOffset }}', // changed value
											operator: {
												name: 'filter.operator.equals',
												operation: 'equals',
												type: 'string',
											},
											rightValue: '',
										},
									],
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
										version: 3,
									},
								},
								options: {},
							},
							name: 'n1',
						},
					]),
					expected: false,
				},
				{
					description: 'should return true when next string contains parts of previous string',
					baseWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					nextWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'val with some text ue1' }, name: 'n1' },
					]),
					expected: true,
				},
				{
					description: 'should return false when prev string contains parts of next string',
					baseWorkflow: createWorkflow('1', [
						{ id: '1', parameters: { a: 'val with some text ue1' }, name: 'n1' },
					]),
					nextWorkflow: createWorkflow('1', [{ id: '1', parameters: { a: 'value1' }, name: 'n1' }]),
					expected: false,
				},
			])('$description', ({ baseWorkflow, nextWorkflow, expected }) => {
				const result = RULES.mergeAdditiveChanges(
					baseWorkflow,
					nextWorkflow,
					new WorkflowChangeSet(baseWorkflow, nextWorkflow),
				);

				expect(result).toEqual(expected);
			});
		});
		describe('skipTimeDifference', () => {
			const createWorkflow = (createdAt: Date): DiffableWorkflow<DiffableNode> => ({
				nodes: [],
				connections: {},
				createdAt,
			});

			const skipTimeDifference = SKIP_RULES.makeSkipTimeDifference(30 * 60 * 1000);

			it('should return false when time difference is within 30 minutes', () => {
				const prev = createWorkflow(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:29:59Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should return true when time difference exceeds 30 minutes', () => {
				const prev = createWorkflow(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:30:01Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(true);
			});

			it('should return true when time difference is exactly 30 minutes and 1 millisecond', () => {
				const prev = createWorkflow(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:30:00.001Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(true);
			});

			it('should return false when time difference is exactly 30 minutes', () => {
				const prev = createWorkflow(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:30:00Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should handle workflows with the same timestamp', () => {
				const timestamp = new Date('2023-01-01T12:00:00Z');
				const prev = createWorkflow(timestamp);
				const next = createWorkflow(timestamp);

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should handle workflows with negative time difference', () => {
				const prev = createWorkflow(new Date('2023-01-01T12:30:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:00:00Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should correctly handle other time skip settings', () => {
				const skipDifferentUsers10 = SKIP_RULES.makeSkipTimeDifference(10 * 60 * 1000);

				const prev = createWorkflow(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflow(new Date('2023-01-01T12:29:59Z'));

				const result = skipDifferentUsers10(prev, next);

				expect(result).toBe(true);
			});
		});
		describe('skipDifferentUsers', () => {
			const createWorkflow = (authors?: string): DiffableWorkflow<DiffableNode> => ({
				nodes: [],
				connections: {},
				createdAt: new Date(),
				authors,
			});

			it('should return true when users are different', () => {
				const prev = createWorkflow('user1');
				const next = createWorkflow('user2');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(true);
			});

			it('should return false when users are the same', () => {
				const prev = createWorkflow('user1');
				const next = createWorkflow('user1');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(false);
			});

			it('should return false when both users are undefined', () => {
				const prev = createWorkflow(undefined);
				const next = createWorkflow(undefined);

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(false);
			});

			it('should return true when one user is undefined and the other is defined', () => {
				const prev = createWorkflow(undefined);
				const next = createWorkflow('user1');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(true);
			});
		});

		describe('RULES.makeMergeDependingOnSizeRule', () => {
			// Helper to create mock workflows
			const createWorkflow = (createdAt: Date) =>
				mock<IWorkflowBase>({
					createdAt,
				});

			const createMetaData = (workflowSizeScore: number): DiffMetaData => ({
				workflowSizeScore,
			});

			const wcs = mock<WorkflowChangeSet<INode>>({});

			describe('basic functionality', () => {
				it('should return false when workflow size is smaller than all thresholds', () => {
					const mapping = new Map([
						[1000, 60000], // 1000 chars -> 1 min
						[5000, 300000], // 5000 chars -> 5 min
					]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:10:00Z'));
					const metaData = createMetaData(500); // Smaller than smallest threshold

					expect(rule(prev, next, wcs, metaData)).toBe(false);
				});

				it('should apply the correct time threshold for workflow size', () => {
					const mapping = new Map([
						[1000, 60000], // 1000 chars -> 1 min
						[5000, 300000], // 5000 chars -> 5 min
					]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					// Time difference: 2 minutes (120000ms)
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:02:00Z'));

					expect(rule(prev, next, wcs, createMetaData(300))).toBe(false);
					expect(rule(prev, next, wcs, createMetaData(1300))).toBe(false);
					expect(rule(prev, next, wcs, createMetaData(5300))).toBe(true);
				});
			});

			describe('threshold boundary cases', () => {
				it('should use exact threshold when workflow size matches', () => {
					const mapping = new Map([
						[1000, 60000],
						[5000, 300000],
					]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:02:00Z'));

					// Should use 1000 char threshold since 5000 > 5000 is false
					expect(rule(prev, next, wcs, createMetaData(5000))).toBe(false);
					expect(rule(prev, next, wcs, createMetaData(5001))).toBe(true);
				});
			});

			describe('multiple thresholds', () => {
				it('should handle three or more thresholds correctly', () => {
					const mapping = new Map([
						[5000, 120000], // 5000 chars -> 2 min
						[1000, 30000], // 1000 chars -> 30 sec
						[10000, 300000], // 10000 chars -> 5 min
					]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					// Test small workflow
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:01:00Z')); // 1 min
					expect(rule(prev, next, wcs, createMetaData(2000))).toBe(false); // 1 min > 30 sec

					// Test medium workflow
					expect(rule(prev, next, wcs, createMetaData(7000))).toBe(true); // 1 min < 2 min

					// Test large workflow
					expect(rule(prev, next, wcs, createMetaData(12000))).toBe(true); // 1 min < 5 min
				});
			});

			describe('edge cases', () => {
				it('should handle empty mapping', () => {
					const mapping = new Map<number, number>();
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const metaData = createMetaData(5000);
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:10:00Z'));

					expect(rule(prev, next, wcs, metaData)).toBe(false);
				});

				it('should handle single threshold', () => {
					const mapping = new Map([[1000, 60000]]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const metaData = createMetaData(2000);
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next1 = createWorkflow(new Date('2024-01-01T10:00:30Z'));
					const next2 = createWorkflow(new Date('2024-01-01T10:02:00Z'));

					expect(rule(prev, next1, wcs, metaData)).toBe(true);
					expect(rule(prev, next2, wcs, metaData)).toBe(false);
				});

				it('should handle zero workflow size', () => {
					const mapping = new Map([[1000, 60000]]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const metaData = createMetaData(0);
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-01T10:10:00Z'));

					expect(rule(prev, next, wcs, metaData)).toBe(false);
				});

				it('should handle zero time difference', () => {
					const mapping = new Map([[1000, 60000]]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const metaData = createMetaData(2000);
					const sameTime = new Date('2024-01-01T10:00:00Z');
					const prev = createWorkflow(sameTime);
					const next = createWorkflow(sameTime);

					expect(rule(prev, next, wcs, metaData)).toBe(true);
				});

				it('should handle very large time differences', () => {
					const mapping = new Map([[1000, 60000]]);
					const rule = RULES.makeMergeDependingOnSizeRule(mapping);

					const metaData = createMetaData(2000);
					const prev = createWorkflow(new Date('2024-01-01T10:00:00Z'));
					const next = createWorkflow(new Date('2024-01-02T10:00:00Z')); // 1 day later

					expect(rule(prev, next, wcs, metaData)).toBe(false);
				});
			});
		});
	});
});
describe('stringContainsParts', () => {
	test.each([
		['abcde', 'abde', true],
		['abcde', 'abced', false],
		['abc', 'abcd', false],
		['abcde', '', true],
		['abcde', 'abcde', true],
		['', 'a', false],
		['abcde', 'c', true],
		['abcde', 'z', false],
		['abcde', 'abc', true],
		['abcde', 'cde', true],
		['abcde', 'abfz', false],
		['abcde', 'ace', true],
		['abcde', 'aec', false],
	])('$[0]', (s, substr, expected) => {
		const result = stringContainsParts(s, substr);
		expect(result).toBe(expected);
	});
});
describe('hasNonPositionalChanges', () => {
	const createNode = (id: string, overrides: Partial<INode> = {}): INode => ({
		id,
		name: `Node ${id}`,
		type: 'test-type',
		typeVersion: 1,
		position: [100, 200],
		parameters: {},
		...overrides,
	});

	it('should return false when only positions changed', () => {
		const oldNodes = [createNode('1', { position: [100, 200] })];
		const newNodes = [createNode('1', { position: [300, 400] })];

		const result = hasNonPositionalChanges(oldNodes, newNodes, {}, {});

		expect(result).toBe(false);
	});

	it('should return true when a node is added', () => {
		const oldNodes = [createNode('1')];
		const newNodes = [createNode('1'), createNode('2')];

		const result = hasNonPositionalChanges(oldNodes, newNodes, {}, {});

		expect(result).toBe(true);
	});

	it('should return true when a node is deleted', () => {
		const oldNodes = [createNode('1'), createNode('2')];
		const newNodes = [createNode('1')];

		const result = hasNonPositionalChanges(oldNodes, newNodes, {}, {});

		expect(result).toBe(true);
	});

	it('should return true when node name changes', () => {
		const oldNodes = [createNode('1', { name: 'Original Name' })];
		const newNodes = [createNode('1', { name: 'New Name' })];

		const result = hasNonPositionalChanges(oldNodes, newNodes, {}, {});

		expect(result).toBe(true);
	});

	it('should return true when node parameters change', () => {
		const oldNodes = [createNode('1', { parameters: { param1: 'value1' } })];
		const newNodes = [createNode('1', { parameters: { param1: 'value2' } })];

		const result = hasNonPositionalChanges(oldNodes, newNodes, {}, {});

		expect(result).toBe(true);
	});

	it('should return true when connections change', () => {
		const oldNodes = [createNode('1'), createNode('2')];
		const newNodes = [createNode('1'), createNode('2')];
		const oldConnections: IConnections = {};
		const newConnections: IConnections = {
			'Node 1': {
				main: [[{ node: 'Node 2', type: 'main', index: 0 }]],
			},
		};

		const result = hasNonPositionalChanges(oldNodes, newNodes, oldConnections, newConnections);

		expect(result).toBe(true);
	});

	it('should return false when nodes and connections are identical', () => {
		const oldNodes = [createNode('1'), createNode('2')];
		const newNodes = [createNode('1'), createNode('2')];
		const connections: IConnections = {
			'Node 1': {
				main: [[{ node: 'Node 2', type: 'main', index: 0 }]],
			},
		};

		const result = hasNonPositionalChanges(oldNodes, newNodes, connections, connections);

		expect(result).toBe(false);
	});

	it('should return false for empty workflows', () => {
		const result = hasNonPositionalChanges([], [], {}, {});

		expect(result).toBe(false);
	});
});

describe('hasCredentialChanges', () => {
	const createNode = (id: string, overrides: Partial<INode> = {}): INode => ({
		id,
		name: `Node ${id}`,
		type: 'test-type',
		typeVersion: 1,
		position: [100, 200],
		parameters: {},
		...overrides,
	});

	it('should return false when no credentials exist', () => {
		const oldNodes = [createNode('1')];
		const newNodes = [createNode('1')];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(false);
	});

	it('should return false when credentials are identical', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(false);
	});

	it('should return true when credential is added to a node', () => {
		const oldNodes = [createNode('1')];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should return true when credential is removed from a node', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];
		const newNodes = [createNode('1')];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should return true when credential ID changes', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-2', name: 'Test Credential' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should return false when only credential name changes but ID stays the same', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Old Name' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'New Name' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(false);
	});

	it('should return true when a new credential type is added', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: {
					testApi: { id: 'cred-1', name: 'Test Credential' },
					anotherApi: { id: 'cred-2', name: 'Another Credential' },
				},
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should return true when a credential type is removed', () => {
		const oldNodes = [
			createNode('1', {
				credentials: {
					testApi: { id: 'cred-1', name: 'Test Credential' },
					anotherApi: { id: 'cred-2', name: 'Another Credential' },
				},
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should handle multiple nodes correctly', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
			createNode('2', {
				credentials: { testApi: { id: 'cred-2', name: 'Test Credential 2' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
			createNode('2', {
				credentials: { testApi: { id: 'cred-2', name: 'Test Credential 2' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(false);
	});

	it('should return true when credential changes in second node', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
			createNode('2', {
				credentials: { testApi: { id: 'cred-2', name: 'Test Credential 2' } },
			}),
		];
		const newNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
			createNode('2', {
				credentials: { testApi: { id: 'cred-3', name: 'Test Credential 3' } },
			}),
		];

		const result = hasCredentialChanges(oldNodes, newNodes);

		expect(result).toBe(true);
	});

	it('should return false for empty node arrays', () => {
		const result = hasCredentialChanges([], []);

		expect(result).toBe(false);
	});

	it('should return false when node is deleted (deletion is not a credential change)', () => {
		const oldNodes = [
			createNode('1', {
				credentials: { testApi: { id: 'cred-1', name: 'Test Credential' } },
			}),
		];
		const newNodes: INode[] = [];

		const result = hasCredentialChanges(oldNodes, newNodes);

		// When a node is deleted, it's not considered a credential change
		expect(result).toBe(false);
	});
});
