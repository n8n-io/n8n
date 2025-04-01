import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { mock } from 'jest-mock-extended';
import type { Producer, RecordMetadata } from 'kafkajs';
import { Kafka as apacheKafka } from 'kafkajs';
import type { IExecuteFunctions } from 'n8n-workflow';

import path from 'path';
import { getWorkflowFilenames, testWorkflows } from '../../test/nodes/Helpers';

jest.mock('kafkajs', () => {
	const originalModule = jest.requireActual('kafkajs');
	return {
		...originalModule,
		Kafka: jest.fn(),
		logLevel: { ERROR: 0 },
	};
});

jest.mock('@kafkajs/confluent-schema-registry', () => {
	return {
		SchemaRegistry: jest.fn(),
	};
});

describe('Kafka Node', () => {
	let mockProducer: jest.Mocked<Producer>;
	let mockKafka: jest.Mocked<apacheKafka>;
	let mockRegistry: jest.Mocked<SchemaRegistry>;
	let mockProducerConnect: jest.Mock;
	let mockProducerSend: jest.Mock;
	let mockProducerDisconnect: jest.Mock;
	let mockRegistryEncode: jest.Mock;

	beforeEach(() => {
		mockProducerConnect = jest.fn();
		mockProducerSend = jest
			.fn()
			.mockResolvedValue([{ partition: 0, errorCode: 0 }] as RecordMetadata[]);
		mockProducerDisconnect = jest.fn();

		mockProducer = mock<Producer>({
			connect: mockProducerConnect,
			send: mockProducerSend,
			disconnect: mockProducerDisconnect,
		});

		mockKafka = mock<apacheKafka>({
			producer: jest.fn().mockReturnValue(mockProducer),
		});

		mockRegistryEncode = jest.fn().mockResolvedValue(Buffer.from('encoded-data'));
		mockRegistry = mock<SchemaRegistry>({
			encode: mockRegistryEncode,
		});

		(apacheKafka as jest.Mock).mockReturnValue(mockKafka);
		(SchemaRegistry as jest.Mock).mockReturnValue(mockRegistry);
	});

	const workflows = getWorkflowFilenames(path.join(__dirname, 'test'));

	console.log(workflows);
	testWorkflows(workflows);
});
