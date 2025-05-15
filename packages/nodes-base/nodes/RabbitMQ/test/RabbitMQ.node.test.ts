import type { Channel } from 'amqplib';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { RabbitMQ } from '../RabbitMQ.node';

describe('RabbitMQ Node', () => {
	const mockChannel = mock<Channel>({
		publish: jest.fn().mockReturnValue(true),
		close: jest.fn(),
		connection: mock({ close: jest.fn() }),
	});
	const context = mock<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should use per-item routingKey when publishing to exchange', async () => {
		const items: INodeExecutionData[] = [
			{ json: { message: 'msg1' } },
			{ json: { message: 'msg2' } },
		];

		// Mock getInputData() to return multiple items
		context.getInputData.mockReturnValue(items);

		// Mock parameters per item
		context.getNodeParameter.mockImplementation((paramName, itemIndex) => {
			const params: Record<string, string | boolean | object> = {
				mode: 'exchange',
				operation: 'sendMessage',
				exchange: 'test-exchange',
				exchangeType: 'topic',
				routingKey: ['key.1', 'key.2'][itemIndex],
				sendInputData: true,
				options: {},
			};
			return params[paramName];
		});

		// Override the actual exchange connection to return the mock channel
		const node = new RabbitMQ();

		jest
			.spyOn(GenericFunctions, 'rabbitmqConnectExchange')
			.mockImplementation(async () => mockChannel);

		// Run node
		await node.execute.call(context);

		// Assert publish was called with correct routing keys
		expect(mockChannel.publish).toHaveBeenCalledTimes(2);
		expect(mockChannel.publish).toHaveBeenCalledWith(
			'test-exchange',
			'key.1',
			expect.any(Buffer),
			expect.any(Object),
		);
		expect(mockChannel.publish).toHaveBeenCalledWith(
			'test-exchange',
			'key.2',
			expect.any(Buffer),
			expect.any(Object),
		);
	});
});
