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

	describe('special connection map keys', () => {
		// Build connections with an own key that a plain object literal would
		// otherwise route through the prototype (JSON.parse mirrors the request path).
		const parseConnections = (json: string): IConnections => JSON.parse(json) as IConnections;

		afterEach(() => {
			// Guard against a leaked key surviving into other tests. The old accumulator could
			// write onto Object.prototype (bare "__proto__" key) or onto the Object constructor
			// itself ("constructor" key), so clear both.
			delete (Object.prototype as Record<string, unknown>).main;
			delete (Object as unknown as Record<string, unknown>).main;
		});

		it('should record a connection added under a special node name', () => {
			const prev = parseConnections('{"__proto__":{"main":[[]]}}');
			const next = parseConnections(
				'{"__proto__":{"main":[[{"node":"node0","type":"main","index":0}]]}}',
			);

			const result = compareConnections(prev, next);

			expect(({} as Record<string, unknown>).main).toBeUndefined();
			expect(Object.prototype.hasOwnProperty.call(result.added, '__proto__')).toBe(true);
			expect(result.added['__proto__'].main).toEqual([
				{ sourceIndex: 0, value: { index: 0, connection: createConnection('node0', 'main', 0) } },
			]);
			expect(result.removed).toEqual({});
		});

		it('should record a connection removed under a special node name', () => {
			const prev = parseConnections(
				'{"__proto__":{"main":[[{"node":"node0","type":"main","index":0}]]}}',
			);
			const next = parseConnections('{"__proto__":{"main":[[]]}}');

			const result = compareConnections(prev, next);

			expect(({} as Record<string, unknown>).main).toBeUndefined();
			expect(Object.prototype.hasOwnProperty.call(result.removed, '__proto__')).toBe(true);
			expect(result.removed['__proto__'].main).toEqual([
				{ sourceIndex: 0, value: { index: 0, connection: createConnection('node0', 'main', 0) } },
			]);
			expect(result.added).toEqual({});
		});

		it('should detect a connection added under a special input name', () => {
			const prev = parseConnections('{"node1":{"__proto__":[[]]}}');
			const next = parseConnections(
				'{"node1":{"__proto__":[[{"node":"node0","type":"main","index":0}]]}}',
			);

			const result = compareConnections(prev, next);

			expect(result.added.node1['__proto__']).toEqual([
				{ sourceIndex: 0, value: { index: 0, connection: createConnection('node0', 'main', 0) } },
			]);
			expect(result.removed).toEqual({});
		});

		it('should detect a connection removed under a special input name', () => {
			const prev = parseConnections(
				'{"node1":{"__proto__":[[{"node":"node0","type":"main","index":0}]]}}',
			);
			const next = parseConnections('{"node1":{"__proto__":[[]]}}');

			const result = compareConnections(prev, next);

			expect(({} as Record<string, unknown>).main).toBeUndefined();
			expect(result.removed.node1['__proto__']).toEqual([
				{ sourceIndex: 0, value: { index: 0, connection: createConnection('node0', 'main', 0) } },
			]);
			expect(result.added).toEqual({});
		});

		it('should report no change when both sides carry a special key', () => {
			const connections = parseConnections(
				'{"__proto__":{"__proto__":[[{"node":"node0","type":"main","index":0}]]}}',
			);

			const result = compareConnections(connections, connections);

			expect(({} as Record<string, unknown>).main).toBeUndefined();
			expect(result.added).toEqual({});
			expect(result.removed).toEqual({});
		});

		it('should not leak keys for "constructor" and "prototype" node names', () => {
			const prev = parseConnections('{"constructor":{"main":[[]]},"prototype":{"main":[[]]}}');
			const next = parseConnections(
				'{"constructor":{"main":[[{"node":"node0","type":"main","index":0}]]},' +
					'"prototype":{"main":[[{"node":"node0","type":"main","index":0}]]}}',
			);

			const result = compareConnections(prev, next);

			// No write reached Object.prototype or the Object constructor. The old accumulator
			// resolved "constructor"/"prototype" through the prototype chain, so these keys landed
			// on inherited objects rather than as own keys of `added`.
			expect(({} as Record<string, unknown>).main).toBeUndefined();
			expect((Object as unknown as Record<string, unknown>).main).toBeUndefined();
			expect(Object.prototype.hasOwnProperty.call(result.added, 'constructor')).toBe(true);
			expect(Object.prototype.hasOwnProperty.call(result.added, 'prototype')).toBe(true);
			expect(result.added['constructor'].main).toHaveLength(1);
			expect(result.added['prototype'].main).toHaveLength(1);
		});
	});
});
