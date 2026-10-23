import type { IConnections, IConnection } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';
import {
	MAX_CONNECTION_INDEX,
	MAX_DESTINATION_INPUT_SLOTS,
	mapConnectionsByDestination,
} from '../src/common';
import { UserError } from '../src/errors';

describe('getConnectionsByDestination', () => {
	it('should return empty object when there are no connections', () => {
		const result = mapConnectionsByDestination({});

		expect(result).toEqual({});
	});

	it('should throw when a connection index is above the maximum', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node2', type: NodeConnectionTypes.Main, index: MAX_CONNECTION_INDEX + 1 }],
				],
			},
		};

		expect(() => mapConnectionsByDestination(connections)).toThrow(UserError);
	});

	it('should accept a connection index at the maximum', () => {
		const connections: IConnections = {
			Node1: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Node2', type: NodeConnectionTypes.Main, index: MAX_CONNECTION_INDEX }],
				],
			},
		};

		const result = mapConnectionsByDestination(connections);

		expect(result.Node2[NodeConnectionTypes.Main]).toHaveLength(MAX_CONNECTION_INDEX + 1);
	});

	describe('input slot budget', () => {
		const slotsPerDestination = MAX_CONNECTION_INDEX + 1;
		const destinationsWithinBudget = Math.floor(MAX_DESTINATION_INPUT_SLOTS / slotsPerDestination);

		const connectToDestinations = (count: number): IConnections => ({
			Node1: {
				[NodeConnectionTypes.Main]: [
					Array.from({ length: count }, (_, i) => ({
						node: `Target${i}`,
						type: NodeConnectionTypes.Main,
						index: MAX_CONNECTION_INDEX,
					})),
				],
			},
		});

		it('should throw when connections use more input slots than the budget', () => {
			const connections = connectToDestinations(destinationsWithinBudget + 1);

			expect(() => mapConnectionsByDestination(connections)).toThrow(UserError);
		});

		it('should accept connections within the input slot budget', () => {
			const connections = connectToDestinations(destinationsWithinBudget);

			const result = mapConnectionsByDestination(connections);

			expect(Object.keys(result)).toHaveLength(destinationsWithinBudget);
		});
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
