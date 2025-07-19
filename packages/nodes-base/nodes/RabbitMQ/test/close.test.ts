import type { Channel, Connection } from 'amqplib';
import { mock } from 'jest-mock-extended';
import type { ITriggerFunctions } from 'n8n-workflow';

import type { MessageTracker } from '../GenericFunctions';
import { setCloseFunction } from '../utils/close';

describe('setCloseFunction', () => {
	let mockChannel: Channel;
	let mockConnection: Connection;
	let mockMessageTracker: MessageTracker;
	let mockTriggerFunctions: jest.Mocked<ITriggerFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockChannel = mock<Channel>();
		mockConnection = mock<Connection>();
		mockChannel.connection = mockConnection;
		mockMessageTracker = mock<MessageTracker>({
			closeChannel: jest.fn(),
		});

		mockTriggerFunctions = mock<ITriggerFunctions>({
			getNodeParameter: jest.fn(),
			getMode: jest.fn(),
			emit: jest.fn(),
		});
	});

	describe('manual mode', () => {
		it('should return close function that closes channel and connection directly', async () => {
			mockTriggerFunctions.getMode.mockReturnValue('manual');

			const closeFunction = setCloseFunction.call(
				mockTriggerFunctions,
				mockChannel,
				mockMessageTracker,
				'consumerTag123',
			);

			await closeFunction();

			expect(mockChannel.close).toHaveBeenCalledTimes(1);
			expect(mockConnection.close).toHaveBeenCalledTimes(1);
			expect(mockMessageTracker.closeChannel).not.toHaveBeenCalled();
		});
	});

	describe('production mode', () => {
		it('should work with different consumer tags', async () => {
			mockTriggerFunctions.getMode.mockReturnValue('trigger');

			const consumerTags = ['tag1', 'tag2', 'special-tag-123'];

			for (const tag of consumerTags) {
				const closeFunction = setCloseFunction.call(
					mockTriggerFunctions,
					mockChannel,
					mockMessageTracker,
					tag,
				);

				await closeFunction();

				expect(mockMessageTracker.closeChannel).toHaveBeenCalledWith(mockChannel, tag);
			}

			expect(mockMessageTracker.closeChannel).toHaveBeenCalledTimes(3);
		});
	});
});
