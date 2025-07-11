import type { Channel } from 'amqplib';
import { mock } from 'jest-mock-extended';
import type { ITriggerFunctions } from 'n8n-workflow';

import { MessageTracker, rabbitmqConnectQueue, parseMessage } from '../GenericFunctions';
import { RabbitMQTrigger } from '../RabbitMQTrigger.node';
import { setCloseFunction } from '../utils/close';

// Mock all external dependencies
jest.mock('amqplib');
jest.mock('../GenericFunctions', () => ({
	MessageTracker: jest.fn(),
	rabbitmqConnectQueue: jest.fn(),
	parseMessage: jest.fn(),
}));
jest.mock('../utils/close', () => ({
	setCloseFunction: jest.fn(),
}));

describe('RabbitMQTrigger Node', () => {
	let mockChannel: jest.Mocked<Channel>;
	let mockMessageTracker: jest.Mocked<MessageTracker>;
	let mockTriggerFunctions: jest.Mocked<ITriggerFunctions>;
	let mockSetCloseFunction: jest.MockedFunction<typeof setCloseFunction>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockChannel = mock<Channel>({
			consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer-tag' }),
			prefetch: jest.fn(),
			get: jest.fn().mockResolvedValue(false),
			ack: jest.fn(),
			nack: jest.fn(),
			cancel: jest.fn(),
			close: jest.fn(),
			connection: { close: jest.fn() },
		});

		mockMessageTracker = mock<MessageTracker>({
			received: jest.fn(),
			answered: jest.fn(),
			closeChannel: jest.fn(),
		});

		mockTriggerFunctions = mock<ITriggerFunctions>({
			getNodeParameter: jest.fn(),
			getMode: jest.fn(),
			emit: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Test RabbitMQ Trigger' }),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			helpers: {
				createDeferredPromise: jest.fn(),
				returnJsonArray: jest.fn(),
			},
		});

		(rabbitmqConnectQueue as jest.Mock).mockResolvedValue(mockChannel);
		(MessageTracker as jest.Mock).mockReturnValue(mockMessageTracker);
		(parseMessage as jest.Mock).mockResolvedValue({ json: { test: 'data' } });

		mockSetCloseFunction = setCloseFunction as jest.MockedFunction<typeof setCloseFunction>;
		const mockCloseFunction = jest.fn().mockResolvedValue(undefined);
		mockSetCloseFunction.mockReturnValue(mockCloseFunction);
	});

	describe('setCloseFunction integration', () => {
		it('should call setCloseFunction with correct parameters in trigger mode', async () => {
			mockTriggerFunctions.getNodeParameter
				.mockReturnValueOnce('test-queue')
				.mockReturnValueOnce({});
			mockTriggerFunctions.getMode.mockReturnValue('trigger');

			const trigger = new RabbitMQTrigger();
			await trigger.trigger.call(mockTriggerFunctions);

			expect(mockSetCloseFunction).toHaveBeenCalledWith(
				mockChannel,
				mockMessageTracker,
				'test-consumer-tag',
			);
			expect(mockSetCloseFunction).toHaveBeenCalledTimes(1);
		});

		it('should call setCloseFunction with correct parameters in manual mode', async () => {
			mockTriggerFunctions.getNodeParameter
				.mockReturnValueOnce('test-queue')
				.mockReturnValueOnce({});
			mockTriggerFunctions.getMode.mockReturnValue('manual');

			const trigger = new RabbitMQTrigger();
			await trigger.trigger.call(mockTriggerFunctions);

			expect(mockSetCloseFunction).toHaveBeenCalledWith(
				mockChannel,
				mockMessageTracker,
				'test-consumer-tag',
			);
			expect(mockSetCloseFunction).toHaveBeenCalledTimes(1);
		});

		it('should call setCloseFunction with correct consumer tag from channel.consume', async () => {
			const customConsumerTag = 'custom-consumer-123';
			mockChannel.consume.mockResolvedValue({ consumerTag: customConsumerTag });

			mockTriggerFunctions.getNodeParameter
				.mockReturnValueOnce('test-queue')
				.mockReturnValueOnce({});
			mockTriggerFunctions.getMode.mockReturnValue('trigger');

			const trigger = new RabbitMQTrigger();
			await trigger.trigger.call(mockTriggerFunctions);

			expect(mockSetCloseFunction).toHaveBeenCalledWith(
				mockChannel,
				mockMessageTracker,
				customConsumerTag,
			);
		});

		it('should call setCloseFunction with MessageTracker instance', async () => {
			mockTriggerFunctions.getNodeParameter
				.mockReturnValueOnce('test-queue')
				.mockReturnValueOnce({});
			mockTriggerFunctions.getMode.mockReturnValue('trigger');

			const trigger = new RabbitMQTrigger();
			await trigger.trigger.call(mockTriggerFunctions);

			expect(mockSetCloseFunction).toHaveBeenCalledWith(
				mockChannel,
				mockMessageTracker,
				'test-consumer-tag',
			);

			expect(MessageTracker).toHaveBeenCalled();
		});
	});
});
