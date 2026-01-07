import { mock } from 'vitest-mock-extended';

import { type IConnections, type INode, type INodeParameters, type IWorkflowBase } from '../src';
import {
	compareNodes,
	compareWorkflowsNodes,
	groupWorkflows,
	hasCredentialChanges,
	hasNonPositionalChanges,
	NodeDiffStatus,
	RULES,
	SKIP_RULES,
	WorkflowChangeSet,
	type DiffableNode,
	type DiffableWorkflow,
	type DiffRule,
	type GroupedWorkflowHistory,
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
		it('should group workflows with no changes', () => {
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1, node2] },
			]);
			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].workflowChangeSet.nodes.get(node2.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].groupedWorkflows).toEqual([]);
		});

		it('should group workflows with added nodes', () => {
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
			]);

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].workflowChangeSet.nodes.get(node2.id)?.status).toBe(NodeDiffStatus.Added);
			expect(grouped[0].groupedWorkflows).toEqual([]);
		});

		it('should group workflows with deleted nodes', () => {
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
			]);

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].workflowChangeSet.nodes.get(node2.id)?.status).toBe(NodeDiffStatus.Deleted);

			expect(grouped[0].groupedWorkflows).toEqual([]);
		});

		it('should group workflows with modified nodes', () => {
			const modifiedNode2 = { id: '2', parameter: { a: 3 } };
			workflows = mock<[IWorkflowBase, IWorkflowBase]>([
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1, modifiedNode2] },
			]);

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].workflowChangeSet.nodes.get(modifiedNode2.id)?.status).toBe(
				NodeDiffStatus.Modified,
			);
			expect(grouped[0].groupedWorkflows).toEqual([]);
		});

		it('should handle multiple workflow groups', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
			]);

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(2);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[0].workflowChangeSet.nodes.get(node2.id)?.status).toBe(NodeDiffStatus.Added);

			expect(grouped[1].from).toEqual(workflows[1]);
			expect(grouped[1].to).toEqual(workflows[2]);
			expect(grouped[1].workflowChangeSet.nodes.size).toBe(2);
			expect(grouped[1].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
			expect(grouped[1].workflowChangeSet.nodes.get(node2.id)?.status).toBe(NodeDiffStatus.Deleted);
		});

		it('should handle empty workflows array', () => {
			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(0);
		});

		it('should handle single workflow', () => {
			const workflows = mock<IWorkflowBase[]>([{ id: '1', nodes: [node1] }]);

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[0]);
			expect(grouped[0].workflowChangeSet.nodes.size).toEqual(1);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toEqual(NodeDiffStatus.Eq);
			expect(grouped[0].groupedWorkflows).toEqual([]);
		});
	});
	describe('rules', () => {
		it('should not apply an inapplicable rule', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
			]);

			const alwaysMergeRule: DiffRule = (_l, _r) => false;
			const rules = [alwaysMergeRule];

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(2);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].groupedWorkflows).toEqual([]);
			expect(grouped[1].from).toEqual(workflows[1]);
			expect(grouped[1].to).toEqual(workflows[2]);
			expect(grouped[1].groupedWorkflows).toEqual([]);
		});
		it('should apply a given rule', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
			]);

			const alwaysMergeRule: DiffRule = (_l, _r) => true;
			const rules = [alwaysMergeRule];

			const grouped = groupWorkflows(workflows, rules, []);

			expect(grouped.length).toBe(1);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[2]);
			expect(grouped[0].groupedWorkflows).toEqual([workflows[1]]);
			expect(grouped[0].workflowChangeSet.nodes.size).toBe(1);
			expect(grouped[0].workflowChangeSet.nodes.get(node1.id)?.status).toBe(NodeDiffStatus.Eq);
		});
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
			])('$description', ({ baseWorkflow, nextWorkflow, expected }) => {
				const result = RULES.mergeAdditiveChanges(
					{
						from: baseWorkflow,
						to: baseWorkflow,
						groupedWorkflows: [],
						workflowChangeSet: new WorkflowChangeSet(baseWorkflow, baseWorkflow),
					},
					{
						from: nextWorkflow,
						to: nextWorkflow,
						groupedWorkflows: [],
						workflowChangeSet: new WorkflowChangeSet(nextWorkflow, nextWorkflow),
					},
					new WorkflowChangeSet(baseWorkflow, nextWorkflow),
				);

				expect(result).toEqual(expected);
			});
		});
		describe('skipTimeDifference', () => {
			const createWorkflowHistory = (
				createdAt: Date,
			): GroupedWorkflowHistory<DiffableWorkflow<DiffableNode>> => ({
				from: {
					nodes: [],
					connections: {},
					createdAt,
				},
				to: {
					nodes: [],
					connections: {},
					createdAt,
				},
				groupedWorkflows: [],
				workflowChangeSet: new WorkflowChangeSet(
					{
						nodes: [],
						connections: {},
						createdAt,
					},
					{
						nodes: [],
						connections: {},
						createdAt,
					},
				),
			});

			const skipTimeDifference = SKIP_RULES.makeSkipTimeDifference(30 * 60 * 1000);

			it('should return false when time difference is within 30 minutes', () => {
				const prev = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:29:59Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should return true when time difference exceeds 30 minutes', () => {
				const prev = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:30:01Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(true);
			});

			it('should return true when time difference is exactly 30 minutes and 1 millisecond', () => {
				const prev = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:30:00.001Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(true);
			});

			it('should return false when time difference is exactly 30 minutes', () => {
				const prev = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:30:00Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should handle workflows with the same timestamp', () => {
				const timestamp = new Date('2023-01-01T12:00:00Z');
				const prev = createWorkflowHistory(timestamp);
				const next = createWorkflowHistory(timestamp);

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should handle workflows with negative time difference', () => {
				const prev = createWorkflowHistory(new Date('2023-01-01T12:30:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));

				const result = skipTimeDifference(prev, next);

				expect(result).toBe(false);
			});

			it('should correctly handle other time skip settings', () => {
				const skipDifferentUsers10 = SKIP_RULES.makeSkipTimeDifference(10 * 60 * 1000);

				const prev = createWorkflowHistory(new Date('2023-01-01T12:00:00Z'));
				const next = createWorkflowHistory(new Date('2023-01-01T12:29:59Z'));

				const result = skipDifferentUsers10(prev, next);

				expect(result).toBe(true);
			});
		});
		describe('skipDifferentUsers', () => {
			const createWorkflowHistory = (
				user: unknown,
			): GroupedWorkflowHistory<DiffableWorkflow<DiffableNode>> => ({
				from: {
					nodes: [],
					connections: {},
					createdAt: new Date(),
					user,
				},
				to: {
					nodes: [],
					connections: {},
					createdAt: new Date(),
					user,
				},
				groupedWorkflows: [],
				workflowChangeSet: new WorkflowChangeSet(
					{
						nodes: [],
						connections: {},
						createdAt: new Date(),
						user,
					},
					{
						nodes: [],
						connections: {},
						createdAt: new Date(),
						user,
					},
				),
			});

			it('should return true when users are different', () => {
				const prev = createWorkflowHistory('user1');
				const next = createWorkflowHistory('user2');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(true);
			});

			it('should return false when users are the same', () => {
				const prev = createWorkflowHistory('user1');
				const next = createWorkflowHistory('user1');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(false);
			});

			it('should return false when both users are undefined', () => {
				const prev = createWorkflowHistory(undefined);
				const next = createWorkflowHistory(undefined);

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(false);
			});

			it('should return true when one user is undefined and the other is defined', () => {
				const prev = createWorkflowHistory(undefined);
				const next = createWorkflowHistory('user1');

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(true);
			});

			it('should handle complex user objects', () => {
				const user1 = { id: 1, name: 'User One' };
				const user2 = { id: 2, name: 'User Two' };

				const prev = createWorkflowHistory(user1);
				const next = createWorkflowHistory(user2);

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(true);
			});

			it('should return false when complex user objects are deeply equal', () => {
				const user = { id: 1, name: 'User One' };

				const prev = createWorkflowHistory(user);
				const next = createWorkflowHistory(user);

				const result = SKIP_RULES.skipDifferentUsers(prev, next);

				expect(result).toBe(false);
			});
		});
	});
	describe('groupWorkflows - skipRules', () => {
		const node1 = mock<DiffableNode>({ id: '1', parameters: { a: 1 } });
		const node2 = mock<DiffableNode>({ id: '2', parameters: { a: 2 } });

		let workflows: IWorkflowBase[];
		beforeEach(() => {
			workflows = [];
		});

		it('should skip merging workflows when skipRules apply', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
			]);

			const trueRule: DiffRule = (_l, _r) => true;
			const grouped = groupWorkflows(workflows, [trueRule], [trueRule]);

			expect(grouped.length).toBe(3);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].groupedWorkflows).toEqual([]);
			expect(grouped[1].from).toEqual(workflows[1]);
			expect(grouped[1].to).toEqual(workflows[2]);
			expect(grouped[1].groupedWorkflows).toEqual([]);
			expect(grouped[2].from).toEqual(workflows[2]);
			expect(grouped[2].to).toEqual(workflows[3]);
			expect(grouped[2].groupedWorkflows).toEqual([]);
		});

		it('should not skip merging workflows when skipRules do not apply', () => {
			workflows = mock<IWorkflowBase[]>([
				{ id: '1', nodes: [node1] },
				{ id: '1', nodes: [node1, node2] },
				{ id: '1', nodes: [node1] },
			]);

			const skipRule: DiffRule = (_l, _r) => false; // Never skip merging
			const grouped = groupWorkflows(workflows, [], [skipRule]);

			expect(grouped.length).toBe(2);
			expect(grouped[0].from).toEqual(workflows[0]);
			expect(grouped[0].to).toEqual(workflows[1]);
			expect(grouped[0].groupedWorkflows).toEqual([]);
			expect(grouped[1].from).toEqual(workflows[1]);
			expect(grouped[1].to).toEqual(workflows[2]);
			expect(grouped[1].groupedWorkflows).toEqual([]);
		});
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
