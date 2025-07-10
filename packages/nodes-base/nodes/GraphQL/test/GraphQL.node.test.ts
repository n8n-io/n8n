import { GraphQL } from '../GraphQL.node';

describe('GraphQL Node', () => {
	describe('WebSocket Mode', () => {
		it('should have WebSocket connection mode option', () => {
			const node = new GraphQL();
			const description = node.description;

			// Check that connection mode property exists
			const connectionModeProperty = description.properties.find(
				(prop: any) => prop.name === 'connectionMode',
			);

			expect(connectionModeProperty).toBeDefined();
			expect(connectionModeProperty.options).toContainEqual({
				name: 'WebSocket',
				value: 'websocket',
				description: 'WebSocket connection for real-time subscriptions',
			});
		});

		it('should have WebSocket-specific parameters', () => {
			const node = new GraphQL();
			const description = node.description;

			// Check for WebSocket URL parameter
			const websocketUrlProperty = description.properties.find(
				(prop: any) => prop.name === 'websocketUrl',
			);
			expect(websocketUrlProperty).toBeDefined();

			// Check for connection timeout parameter
			const connectionTimeoutProperty = description.properties.find(
				(prop: any) => prop.name === 'connectionTimeout',
			);
			expect(connectionTimeoutProperty).toBeDefined();

			// Check for subscription timeout parameter
			const subscriptionTimeoutProperty = description.properties.find(
				(prop: any) => prop.name === 'subscriptionTimeout',
			);
			expect(subscriptionTimeoutProperty).toBeDefined();

			// Check for WebSocket headers parameter
			const websocketHeadersProperty = description.properties.find(
				(prop: any) => prop.name === 'websocketHeaders',
			);
			expect(websocketHeadersProperty).toBeDefined();
		});

		it('should have HTTP mode as default', () => {
			const node = new GraphQL();
			const description = node.description;

			const connectionModeProperty = description.properties.find(
				(prop: any) => prop.name === 'connectionMode',
			);

			expect(connectionModeProperty.default).toBe('http');
		});

		it('should have both HTTP and WebSocket options', () => {
			const node = new GraphQL();
			const description = node.description;

			const connectionModeProperty = description.properties.find(
				(prop: any) => prop.name === 'connectionMode',
			);

			expect(connectionModeProperty.options).toHaveLength(2);
			expect(connectionModeProperty.options).toContainEqual({
				name: 'HTTP',
				value: 'http',
				description: 'Standard HTTP request',
			});
			expect(connectionModeProperty.options).toContainEqual({
				name: 'WebSocket',
				value: 'websocket',
				description: 'WebSocket connection for real-time subscriptions',
			});
		});
	});
});
