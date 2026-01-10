import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'kafka' });

/**
 * POC test for Kafka container infrastructure.
 * Demonstrates that the Kafka container and helper work correctly.
 *
 * This test is a starting point for the NODES team to expand into full
 * Kafka Trigger node testing. See CAT-1686 and NODE-4053 for the issues
 * that need to be addressed.
 *
 * @see https://linear.app/n8n/issue/CAT-1686
 * @see https://linear.app/n8n/issue/NODE-4053
 */
test.describe('Kafka Container Infrastructure', () => {
	test('Kafka helper can publish and consume messages @capability:kafka', async ({
		n8nContainer,
	}) => {
		const kafka = n8nContainer.services.kafka;
		const topic = `test-topic-${Date.now()}`;

		// Create a test topic
		await kafka.createTopic(topic, 1);

		// Verify topic was created
		const topics = await kafka.listTopics();
		expect(topics).toContain(topic);

		// Publish test messages
		await kafka.publish(topic, { message: 'Hello from test 1' }, 'key-1');
		await kafka.publish(topic, { message: 'Hello from test 2' }, 'key-2');
		await kafka.publish(topic, 'Plain text message', 'key-3');

		// Consume and verify messages
		const messages = await kafka.consume(topic, {
			maxMessages: 3,
			timeoutMs: 10000,
		});

		expect(messages).toHaveLength(3);
		expect(messages[0].key).toBe('key-1');
		expect(JSON.parse(messages[0].value)).toEqual({ message: 'Hello from test 1' });
		expect(messages[2].value).toBe('Plain text message');

		// Cleanup
		await kafka.deleteTopic(topic);
		await kafka.disconnect();
	});

	/**
	 * TODO (NODES team): Expand this to test the actual Kafka Trigger node.
	 *
	 * Suggested test scenarios based on CAT-1686:
	 *
	 * 1. Basic Kafka Trigger workflow
	 *    - Create workflow with Kafka Trigger
	 *    - Activate workflow
	 *    - Publish message to topic
	 *    - Verify workflow executes and processes message
	 *
	 * 2. Workflow disable/enable behavior
	 *    - Activate workflow
	 *    - Publish messages
	 *    - Disable workflow
	 *    - Publish more messages
	 *    - Verify no new executions occur
	 *    - Re-enable workflow
	 *    - Verify new messages are processed
	 *
	 * 3. Batch processing
	 *    - Configure batch size = 10
	 *    - Publish 10 messages
	 *    - Verify messages arrive in expected batch
	 *
	 * 4. Parallel vs sequential processing
	 *    - Test with parallelProcessing: true vs false
	 *    - Verify batch size is respected in both modes
	 *
	 * 5. Multi-main mode (requires @mode:multi-main tag)
	 *    - Start with 2 mains
	 *    - Verify only one consumer group is active
	 *    - Check for rebalancing issues in logs
	 *
	 * Example credential setup for Kafka Trigger node:
	 *
	 * const kafkaCredential = await api.credentials.createCredential({
	 *   name: 'Kafka (Test)',
	 *   type: 'kafka',
	 *   data: {
	 *     brokers: 'kafka:9093',  // Internal container address
	 *     clientId: 'n8n-test',
	 *     ssl: false,
	 *     authentication: false,
	 *   },
	 * });
	 */
	test.skip('Kafka Trigger node processes messages @capability:kafka', async ({
		api,
		n8n,
		n8nContainer,
	}) => {
		const kafka = n8nContainer.services.kafka;
		const topic = `trigger-test-${Date.now()}`;
		const groupId = `n8n-test-group-${Date.now()}`;

		// Create topic first
		await kafka.createTopic(topic, 1);

		// Create Kafka credential pointing to the container
		const kafkaCredential = await api.credentials.createCredential({
			name: 'Kafka (Test)',
			type: 'kafka',
			data: {
				brokers: 'kafka:9093', // Internal container network address
				clientId: 'n8n-test',
				ssl: false,
				authentication: false,
			},
		});

		// Define workflow with Kafka Trigger
		const workflowDefinition = {
			name: 'Kafka Trigger Test',
			nodes: [
				{
					id: '1',
					name: 'Kafka Trigger',
					type: 'n8n-nodes-base.kafkaTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						topic,
						groupId,
						options: {
							fromBeginning: true,
							jsonParseMessage: true,
							parallelProcessing: false,
						},
					},
					credentials: {
						kafka: {
							id: kafkaCredential.id,
							name: kafkaCredential.name,
						},
					},
				},
				{
					id: '2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [200, 0],
					parameters: {
						mode: 'raw',
						jsonOutput: '={{ JSON.stringify($json) }}',
					},
				},
			],
			connections: {
				'Kafka Trigger': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
			active: false,
		} as const;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { workflowId } = await api.workflows.createWorkflowFromDefinition(
			workflowDefinition as Parameters<typeof api.workflows.createWorkflowFromDefinition>[0],
			{ makeUnique: true },
		);

		// Activate the workflow
		await api.workflows.activateWorkflow(workflowId);

		// Give the trigger time to connect to Kafka
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Publish a test message
		await kafka.publish(topic, { test: 'message', timestamp: Date.now() });

		// Wait for execution to complete
		// TODO: Replace with proper execution assertion once available
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Verify execution happened (check executions API)
		// TODO: Add proper assertion

		// Cleanup
		await api.workflows.deactivateWorkflow(workflowId);
		await kafka.deleteTopic(topic);
		await kafka.disconnect();
	});
});
