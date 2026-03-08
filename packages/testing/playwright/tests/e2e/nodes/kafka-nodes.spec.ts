import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'kafka' });

test.describe('Kafka Nodes', {
	annotation: [
		{ type: 'owner', description: 'NODES' },
	],
}, () => {
	test('Kafka node publishes messages to topic @capability:kafka', async ({
		api,
		n8n,
		services,
	}) => {
		const kafka = services.kafka;
		const topic = `producer-test-${nanoid()}`;
		const testPayload = { greeting: 'Hello from n8n Kafka node' };

		await kafka.createTopic(topic, 1);

		const kafkaCredential = await api.credentials.createCredential({
			name: 'Kafka (Test)',
			type: 'kafka',
			data: {
				brokers: 'kafka:9092',
				clientId: 'n8n-test-producer',
				ssl: false,
				authentication: false,
			},
		});

		const workflowDefinition = {
			name: 'Kafka Producer Test',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
				{
					id: '2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [200, 0] as [number, number],
					parameters: {
						mode: 'raw',
						jsonOutput: JSON.stringify(testPayload),
					},
				},
				{
					id: '3',
					name: 'Kafka',
					type: 'n8n-nodes-base.kafka',
					typeVersion: 1,
					position: [400, 0] as [number, number],
					parameters: {
						topic,
						sendInputData: true,
						useKey: true,
						key: 'test-key',
						options: {},
					},
					credentials: {
						kafka: {
							id: kafkaCredential.id,
							name: kafkaCredential.name,
						},
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
				Set: {
					main: [[{ node: 'Kafka', type: 'main', index: 0 }]],
				},
			},
			active: false,
		};

		const { workflowId } = await api.workflows.createWorkflowFromDefinition(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			workflowDefinition as any,
			{ makeUnique: true },
		);

		await n8n.page.goto(`/workflow/${workflowId}`);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		const messages = await kafka.consume(topic, { maxMessages: 1, timeoutMs: 10000 });

		expect(messages).toHaveLength(1);
		expect(messages[0].key).toBe('test-key');
		expect(JSON.parse(messages[0].value)).toMatchObject(testPayload);
	});

	test('Kafka Trigger node processes messages @capability:kafka', async ({ api, services }) => {
		const kafka = services.kafka;
		const topic = `trigger-test-${nanoid()}`;
		const groupId = `n8n-test-group-${nanoid()}`;

		await kafka.createTopic(topic, 1);

		const kafkaCredential = await api.credentials.createCredential({
			name: 'Kafka (Test)',
			type: 'kafka',
			data: {
				brokers: 'kafka:9092',
				clientId: 'n8n-test',
				ssl: false,
				authentication: false,
			},
		});

		const workflowDefinition = {
			name: 'Kafka Trigger Test',
			nodes: [
				{
					id: '1',
					name: 'Kafka Trigger',
					type: 'n8n-nodes-base.kafkaTrigger',
					typeVersion: 1.1,
					position: [0, 0] as [number, number],
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
					name: 'No Operation',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 0] as [number, number],
				},
			],
			connections: {
				'Kafka Trigger': {
					main: [[{ node: 'No Operation', type: 'main', index: 0 }]],
				},
			},
			active: false,
		};

		const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			workflowDefinition as any,
			{ makeUnique: true },
		);

		await api.workflows.activate(workflowId, createdWorkflow.versionId!);
		await kafka.waitForConsumerGroup(groupId);

		const testPayload = { test: 'message' };
		await kafka.publish(topic, testPayload);

		const execution = await api.workflows.waitForExecution(workflowId, 10000, 'trigger');
		expect(execution.status).toBe('success');
	});
});
