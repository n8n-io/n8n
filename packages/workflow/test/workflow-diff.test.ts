import { compareNodes, compareWorkflowsNodes, NodeDiffStatus } from '../src/workflow-diff';

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
		parameters: Record<string, unknown>;
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
		parameters: Record<string, unknown>;
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
