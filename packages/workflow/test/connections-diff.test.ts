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
});
