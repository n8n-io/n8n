import { mocked } from 'vitest-mock-extended';

import { type IConnection, type IConnections } from '../src';
import { compareConnections } from '../src/connections-diff';

// Mock IConnection for testing
const createConnection = (node: string, type: IConnection['type'], index: number): IConnection =>
	mocked<IConnection>({
		node,
		type,
		index,
	});

describe('compareConnections', () => {
	describe('empty states', () => {
		it('should return empty diff when both prev and next are empty', () => {
			const prev: IConnections = {};
			const next: IConnections = {};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});

		it('should detect all connections as added when prev is empty', () => {
			const prev: IConnections = {};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({});
		});

		it('should detect all connections as removed when next is empty', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
		});
	});

	describe('no changes', () => {
		it('should return empty diff when connections are identical', () => {
			const connections: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(connections, connections);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});

		it('should handle identical complex structures', () => {
			const connections: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node2', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)]],
				},
			};

			const result = compareConnections(connections, connections);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});
	});

	describe('simple additions and removals', () => {
		it('should detect a single added connection', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node2', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 1, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({});
		});

		it('should detect a single removed connection', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node2', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 1, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
		});

		it('should detect connection replacement', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node2', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
		});
	});

	describe('multiple nodes', () => {
		it('should handle changes across multiple nodes', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node3', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node2: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node3', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({
				node2: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node1', 'main', 0) },
						},
					],
				},
			});
		});

		it('should detect new node with connections', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node2: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node1', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({});
		});

		it('should detect removed node with connections', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({
				node2: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node1', 'main', 0) },
						},
					],
				},
			});
		});
	});

	describe('multiple inputs', () => {
		it('should handle multiple input types on same node', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
					aux: [[createConnection('node2', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
					aux: [[createConnection('node3', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					aux: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node3', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({
				node1: {
					aux: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
		});

		it('should detect new input type', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
					aux: [[createConnection('node2', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					aux: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({});
		});
	});

	describe('multiple source indices', () => {
		it('should handle multiple source indices (switch-like nodes)', () => {
			const prev: IConnections = {
				node1: {
					main: [
						[createConnection('node0', 'main', 0)],
						null,
						[createConnection('node2', 'main', 0)],
					],
				},
			};
			const next: IConnections = {
				node1: {
					main: [
						[createConnection('node0', 'main', 0)],
						[createConnection('node3', 'main', 0)],
						[createConnection('node2', 'main', 0)],
					],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 1,
							value: { index: 0, connection: createConnection('node3', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({});
		});

		it('should detect removed connection at specific source index', () => {
			const prev: IConnections = {
				node1: {
					main: [
						[createConnection('node0', 'main', 0)],
						[createConnection('node3', 'main', 0)],
						[createConnection('node2', 'main', 0)],
					],
				},
			};
			const next: IConnections = {
				node1: {
					main: [
						[createConnection('node0', 'main', 0)],
						null,
						[createConnection('node2', 'main', 0)],
					],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 1,
							value: { index: 0, connection: createConnection('node3', 'main', 0) },
						},
					],
				},
			});
		});
	});

	describe('complex scenarios', () => {
		it('should handle multiple changes simultaneously', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)], [createConnection('node3', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node4', 'main', 0)]],
				},
				node2: {
					main: [[createConnection('node1', 'main', 0)]],
				},
				node3: {
					main: [[createConnection('node2', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 1, connection: createConnection('node4', 'main', 0) },
						},
					],
				},
				node3: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node2', 'main', 0) },
						},
					],
				},
			});
			expect(result.removed).toEqual({
				node2: {
					main: [
						{
							sourceIndex: 1,
							value: { index: 0, connection: createConnection('node3', 'main', 0) },
						},
					],
				},
			});
		});

		it('should handle connections with different indices but same node', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 1)]],
				},
			};

			const result = compareConnections(prev, next);

			// These should be considered different connections
			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node0', 'main', 1) },
						},
					],
				},
			});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 0, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
		});

		it('should handle empty arrays vs null', () => {
			const prev: IConnections = {
				node1: {
					main: [[]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [null],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});
	});

	describe('duplicate connections', () => {
		// Nothing normalizes connections on the way in, so a bucket can hold the same
		// connection twice. Comparing by value alone would collapse the duplicates and
		// hide the change.
		it('should detect removal of one of two identical connections', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 1, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
		});

		it('should detect addition of a second identical connection', () => {
			const prev: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0)]],
				},
			};
			const next: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(prev, next);

			expect(result.removed).toEqual({});
			expect(result.added).toEqual({
				node1: {
					main: [
						{
							sourceIndex: 0,
							value: { index: 1, connection: createConnection('node0', 'main', 0) },
						},
					],
				},
			});
		});

		it('should report no change when the same duplicates are on both sides', () => {
			const connections: IConnections = {
				node1: {
					main: [[createConnection('node0', 'main', 0), createConnection('node0', 'main', 0)]],
				},
			};

			const result = compareConnections(connections, connections);

			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});
	});

	// A connections object parsed from JSON can carry an own-enumerable "__proto__"
	// key (unlike an object literal). Such a node name must be handled as an
	// ordinary own key rather than resolving through the Object.prototype accessor.
	describe('reserved object keys', () => {
		// Always clean up so a regression (which would set the key globally) cannot
		// leak into the rest of the suite / test process.
		afterEach(() => {
			delete (Object.prototype as Record<string, unknown>).n8n_probe_key;
		});

		it('should treat a "__proto__" node name as an ordinary own key on the diff', () => {
			// Two versions that differ only in the connections nested under a literal
			// "__proto__" node.
			const prev = JSON.parse('{"__proto__":{}}') as IConnections;
			const next = JSON.parse(
				'{"__proto__":{"n8n_probe_key":[[{"node":"X","type":"main","index":0}]]}}',
			) as IConnections;

			expect('n8n_probe_key' in prev).toBe(false);

			const result = compareConnections(prev, next);

			// The added connection under "__proto__" must be recorded as an own
			// property of the result, never on the shared Object.prototype.
			expect(({} as Record<string, unknown>).n8n_probe_key).toBeUndefined();
			expect('n8n_probe_key' in Object.prototype).toBe(false);
			expect(Object.keys(result.added)).toContain('__proto__');
		});

		it('should record a connection added under a "__proto__" input name', () => {
			const prev = JSON.parse('{"NodeA":{}}') as IConnections;
			const next = JSON.parse(
				'{"NodeA":{"__proto__":[[{"node":"NodeB","type":"main","index":0}]]}}',
			) as IConnections;

			const result = compareConnections(prev, next);

			// The inherited key must not shortcut the length check; the added
			// connection under the "__proto__" input is recorded on the result.
			expect(result.added.NodeA?.['__proto__']).toHaveLength(1);
			expect(result.removed).toEqual({});
		});

		it('should record a connection removed under a "__proto__" input name', () => {
			const prev = JSON.parse(
				'{"NodeA":{"__proto__":[[{"node":"NodeB","type":"main","index":0}]]}}',
			) as IConnections;
			const next = JSON.parse('{"NodeA":{}}') as IConnections;

			const result = compareConnections(prev, next);

			expect(result.removed.NodeA?.['__proto__']).toHaveLength(1);
			expect(result.added).toEqual({});
		});
	});
});
