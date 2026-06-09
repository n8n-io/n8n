import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Producer } from 'kafkajs';
import { Kafka as apacheKafka } from 'kafkajs';
import type { WorkflowTestData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

jest.mock('kafkajs');
jest.mock('@kafkajs/confluent-schema-registry');

const errorWorkflow = (
	eventName: string,
	message = '{"foo":"bar"}',
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			parameters: {},
			id: 'b1dcfb89-3dda-4d18-bdd6-c12d8dee70d2',
			name: 'When clicking ‘Execute workflow’',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
		},
		{
			parameters: {
				topic: 'error-test-topic',
				sendInputData: false,
				message,
				useSchemaRegistry: true,
				schemaRegistryUrl: '',
				eventName,
				options: {},
			},
			id: '49emc1d5-4d18-4f9b-a2cd-7e2f871a23ed',
			name: 'Schema Registry Error',
			type: 'n8n-nodes-base.kafka',
			typeVersion: 1,
			position: [220, 0],
			credentials: {
				kafka: { id: 'JJBjHkOrIfcj91EX', name: 'Kafka account' },
				schemaRegistryApi: { id: 'wW0eW1iZK9d3Yz2g', name: 'Schema Registry account' },
			},
		},
	],
	connections: {
		'When clicking ‘Execute workflow’': {
			main: [
				[
					{
						node: 'Schema Registry Error',
						type: NodeConnectionTypes.Main,
						index: 0,
					},
				],
			],
		},
	},
});

describe('Kafka Node', () => {
	let mockProducer: jest.Mocked<Producer>;
	let mockKafka: jest.Mocked<apacheKafka>;
	let mockRegistry: jest.Mocked<SchemaRegistry>;
	let mockProducerConnect: jest.Mock;
	let mockProducerSend: jest.Mock;
	let mockProducerDisconnect: jest.Mock;
	let mockRegistryEncode: jest.Mock;
	let mockRegistryGetLatestSchemaId: jest.Mock;

	beforeAll(() => {
		mockProducerConnect = jest.fn();
		mockProducerSend = jest.fn().mockImplementation(async () => []);
		mockProducerDisconnect = jest.fn();

		mockProducer = mock<Producer>({
			connect: mockProducerConnect,
			send: mockProducerSend,
			sendBatch: mockProducerSend,
			disconnect: mockProducerDisconnect,
		});

		mockKafka = mock<apacheKafka>({
			producer: jest.fn().mockReturnValue(mockProducer),
		});

		mockRegistryEncode = jest.fn((_id, input) => Buffer.from(JSON.stringify(input)));
		mockRegistryGetLatestSchemaId = jest.fn(async (eventName: string) => {
			if (eventName === 'failing-event-name') {
				throw new Error('Subject not found');
			}
			return 1;
		});
		mockRegistry = mock<SchemaRegistry>({
			encode: mockRegistryEncode,
			getLatestSchemaId: mockRegistryGetLatestSchemaId,
		});

		(apacheKafka as jest.Mock).mockReturnValue(mockKafka);
		(SchemaRegistry as jest.Mock).mockReturnValue(mockRegistry);
	});

	const harness = new NodeTestHarness();
	const schemaRegistryCredential = {
		url: 'https://cred-kafka-registry.local',
		authentication: 'basicAuth',
		username: 'registry-user',
		password: 'registry-password',
	};

	harness.setupTests({
		credentials: { schemaRegistryApi: schemaRegistryCredential },
	});

	harness.setupTest({
		description:
			'should fail with the misconfiguration message when the credential is missing the password',
		input: { workflowData: errorWorkflow('test-event-name') },
		output: {
			nodeData: {},
			error: 'Username and password are required for Schema Registry Basic Auth',
		},
		credentials: {
			schemaRegistryApi: { ...schemaRegistryCredential, password: '' },
		},
	});

	harness.setupTest({
		description: 'should fail with the generic message when the schema lookup fails',
		input: { workflowData: errorWorkflow('failing-event-name') },
		output: {
			nodeData: {},
			error: 'Verify your Schema Registry configuration',
		},
		credentials: {
			schemaRegistryApi: schemaRegistryCredential,
		},
	});

	harness.setupTest({
		description: 'should fail with the generic message when encoding a message fails',
		input: { workflowData: errorWorkflow('test-event-name', 'not-json') },
		output: {
			nodeData: {},
			error: 'Verify your Schema Registry configuration',
		},
		credentials: {
			schemaRegistryApi: schemaRegistryCredential,
		},
	});

	test('should only connect the producer once the schema registry is resolved', async () => {
		// Cumulative count across all the workflows above: 3 node executions from
		// the two successful workflows, plus 1 from the encode-failure workflow
		// (encoding fails inside the loop, after the producer has connected).
		// The two registry-resolution error workflows (missing password, failing
		// schema lookup) must NOT contribute: registry misconfiguration surfaces
		// before `producer.connect()`, so no connected producer is ever leaked.
		expect(mockProducerConnect).toHaveBeenCalledTimes(4);
	});

	test('should publish the correct kafka messages', async () => {
		expect(mockProducerSend).toHaveBeenCalledTimes(3);
		expect(mockProducerSend).toHaveBeenCalledWith({
			acks: 1,
			compression: 1,
			timeout: 1000,
			topicMessages: [
				{
					messages: [
						{
							headers: { header: 'value' },
							key: 'messageKey',
							value: '{"name":"First item","code":1}',
						},
					],
					topic: 'test-topic',
				},
				{
					messages: [
						{
							headers: { header: 'value' },
							key: 'messageKey',
							value: '{"name":"Second item","code":2}',
						},
					],
					topic: 'test-topic',
				},
			],
		});
		expect(mockProducerSend).toHaveBeenCalledWith({
			acks: 0,
			compression: 0,
			topicMessages: [
				{
					messages: [
						{
							headers: { headerKey: 'headerValue' },
							key: null,
							value: Buffer.from(JSON.stringify({ foo: 'bar' })),
						},
					],
					topic: 'test-topic',
				},
				{
					messages: [
						{
							headers: { headerKey: 'headerValue' },
							key: null,
							value: Buffer.from(JSON.stringify({ foo: 'bar' })),
						},
					],
					topic: 'test-topic',
				},
			],
		});
	});

	test('should configure the schema registry from the selected credential', async () => {
		expect(SchemaRegistry).toHaveBeenCalledWith({
			host: 'https://cred-kafka-registry.local',
			auth: { username: 'registry-user', password: 'registry-password' },
		});
		// The legacy URL-parameter path stays unauthenticated
		expect(SchemaRegistry).toHaveBeenCalledWith({ host: 'https://test-kafka-registry.local' });

		expect(mockProducerSend).toHaveBeenCalledWith(
			expect.objectContaining({
				topicMessages: [
					{
						messages: [
							{
								headers: { headerKey: 'headerValue' },
								key: null,
								value: Buffer.from(JSON.stringify({ foo: 'bar' })),
							},
						],
						topic: 'cred-test-topic',
					},
				],
			}),
		);
	});
});
