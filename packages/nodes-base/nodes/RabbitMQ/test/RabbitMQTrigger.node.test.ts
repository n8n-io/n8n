import { mockDeep } from 'jest-mock-extended';
import type { ITriggerFunctions } from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';
import type { Channel, GetMessage } from 'amqplib';
import { RabbitMQTrigger } from '../RabbitMQTrigger.node';

describe('RabbitMQTrigger node', () => {
	const trigger = new RabbitMQTrigger();
	const mockTriggerFunctions = mockDeep<ITriggerFunctions>();
	const connectSpy = jest.spyOn(GenericFunctions, 'rabbitmqConnectQueue');
	const handleMessageSpy = jest.spyOn(GenericFunctions, 'handleMessage');
	const mockChannel = mockDeep<Channel>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('manual execution', () => {
		it('should get a message from the queue', async () => {
			const message = {
				content: {
					foo: 'bar',
				},
				fields: {
					deliveryTag: 1,
				},
			};
			const options = { acknowledge: 'immediately' };
			mockTriggerFunctions.getMode.mockReturnValue('manual');
			mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'queue':
						return 'testQueue';
					case 'options':
						return options;
				}
				return undefined;
			});
			connectSpy.mockResolvedValue(mockChannel);
			mockChannel.get.mockResolvedValue(message as unknown as GetMessage);

			const { closeFunction, manualTriggerFunction } =
				await trigger.trigger.call(mockTriggerFunctions);
			await manualTriggerFunction!();

			expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
			expect(mockChannel.get).toHaveBeenCalledWith('testQueue');
			expect(handleMessageSpy).toHaveBeenCalledWith(
				message,
				mockChannel,
				expect.anything(),
				'immediately',
				options,
			);
			expect(mockChannel.consume).not.toHaveBeenCalled();
			expect(mockChannel.close).not.toHaveBeenCalled();
			await closeFunction!();
			expect(mockChannel.close).toHaveBeenCalled();
		});

		it('should listen for a message from the queue', async () => {
			const options = { acknowledge: 'immediately' };
			mockTriggerFunctions.getMode.mockReturnValue('manual');
			mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'queue':
						return 'testQueue';
					case 'options':
						return options;
				}
				return undefined;
			});
			connectSpy.mockResolvedValue(mockChannel);
			mockChannel.consume.mockResolvedValue({
				consumerTag: 'testConsumerTag',
			});

			const { closeFunction, manualTriggerFunction } =
				await trigger.trigger.call(mockTriggerFunctions);
			await manualTriggerFunction!();

			expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
			expect(mockChannel.consume).toHaveBeenCalledWith('testQueue', expect.anything());
			expect(mockChannel.close).not.toHaveBeenCalled();
			await closeFunction!();
			expect(mockChannel.close).toHaveBeenCalled();
		});
	});

	describe('regular execution', () => {
		it('should listen for a message from the queue', async () => {
			const options = { acknowledge: 'immediately' };
			mockTriggerFunctions.getMode.mockReturnValue('trigger');
			mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
				switch (parameterName) {
					case 'queue':
						return 'testQueue';
					case 'options':
						return options;
				}
				return undefined;
			});
			connectSpy.mockResolvedValue(mockChannel);
			mockChannel.consume.mockResolvedValue({
				consumerTag: 'testConsumerTag',
			});

			const { closeFunction } = await trigger.trigger.call(mockTriggerFunctions);

			expect(mockChannel.prefetch).not.toHaveBeenCalled();
			expect(mockChannel.consume).toHaveBeenCalledWith('testQueue', expect.anything());
			expect(mockChannel.get).not.toHaveBeenCalled();
			expect(mockChannel.close).not.toHaveBeenCalled();
			await closeFunction!();
			expect(mockChannel.close).toHaveBeenCalled();
		});
	});
});
