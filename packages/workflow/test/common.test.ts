import type { IConnections, IConnection } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';
import { mapConnectionsByDestination } from '../src/common';

describe('getConnectionsByDestination', () => {
	it('should return empty object when there are no connections', () => {
		const result = mapConnectionsByDestination({});

		expect(result).toEqual({});
	});

	it('should return connections by destination node', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Node3', type: NodeConnectionTypes.Main, index: 1 },
					],
				],
			},
		};
		const result = mapConnectionsByDestination(connections);
		expect(result).toEqual({
			Node2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Node3: {
				[NodeConnectionTypes.Main]: [
					[],
					[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		});
	});

	it('should handle multiple connection types', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]],
				[NodeConnectionTypes.AiAgent]: [
					[{ node: 'Node3', type: NodeConnectionTypes.AiAgent, index: 0 }],
				],
			},
		};

		const result = mapConnectionsByDestination(connections);
		expect(result).toEqual({
			Node2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Node3: {
				[NodeConnectionTypes.AiAgent]: [
					[{ node: 'Node1', type: NodeConnectionTypes.AiAgent, index: 0 }],
				],
			},
		});
	});

	it('should handle nodes with no connections', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [[]],
			},
		};

		const result = mapConnectionsByDestination(connections);
		expect(result).toEqual({});
	});

	// @issue https://linear.app/n8n/issue/N8N-7880/cannot-load-some-templates
	it('should handle nodes with null connections', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [
					null as unknown as IConnection[],
					[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		};

		const result = mapConnectionsByDestination(connections);
		expect(result).toEqual({
			Node2: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node1', type: NodeConnectionTypes.Main, index: 1 }]],
			},
		});
	});

	it('should handle nodes with multiple input connections', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Node3: {
				[NodeConnectionTypes.Main]: [[{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};

		const result = mapConnectionsByDestination(connections);
		expect(result).toEqual({
			Node2: {
				[NodeConnectionTypes.Main]: [
					[
						{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 },
						{ node: 'Node3', type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
		});
	});
});
