import type { Channel, Connection, ConsumeMessage, Message } from 'amqplib';
import { mock } from 'jest-mock-extended';
import type { ITriggerFunctions } from 'n8n-workflow';

const mockChannel = mock<Channel>();
const mockConnection = mock<Connection>({ createChannel: async () => mockChannel });
mockChannel.connection = mockConnection;
const connect = jest.fn().mockReturnValue(mockConnection);
jest.mock('amqplib', () => ({ connect }));

import {
	parseMessage,
	rabbitmqConnect,
	rabbitmqConnectExchange,
	rabbitmqConnectQueue,
	rabbitmqCreateChannel,
	MessageTracker,
} from '../GenericFunctions';
import type { TriggerOptions } from '../types';

describe('RabbitMQ GenericFunctions', () => {
	const credentials = {
		hostname: 'some.host',
		port: 5672,
		username: 'user',
		password: 'pass',
		vhost: '/',
	};
	const context = mock<ITriggerFunctions>();

	beforeEach(() => jest.clearAllMocks());

	describe('parseMessage', () => {
		const helpers = mock<ITriggerFunctions['helpers']>();

		it('should handle binary data', async () => {
			const message = mock<Message>();
			const content = Buffer.from('test');
			message.content = content;
			const options = mock<TriggerOptions>({ contentIsBinary: true });
			helpers.prepareBinaryData.mockResolvedValue(mock());

			const item = await parseMessage(message, options, helpers);
			expect(item.json).toBe(message);
			expect(item.binary?.data).toBeDefined();
			expect(helpers.prepareBinaryData).toHaveBeenCalledWith(content);
			expect(message.content).toBeUndefined();
		});

		it('should handle JSON data', async () => {
			const message = mock<Message>();
			const content = Buffer.from(JSON.stringify({ test: 'test' }));
			message.content = content;
			const options = mock<TriggerOptions>({
				contentIsBinary: false,
				jsonParseBody: true,
				onlyContent: false,
			});

			const item = await parseMessage(message, options, helpers);
			expect(item.json).toBe(message);
			expect(item.binary).toBeUndefined();
			expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
			expect(message.content).toEqual({ test: 'test' });
		});

		it('should return only content, when requested', async () => {
			const message = mock<Message>();
			const content = Buffer.from(JSON.stringify({ test: 'test' }));
			message.content = content;
			const options = mock<TriggerOptions>({
				contentIsBinary: false,
				jsonParseBody: false,
				onlyContent: true,
			});

			const item = await parseMessage(message, options, helpers);
			expect(item.json).toBe(content.toString());
			expect(item.binary).toBeUndefined();
			expect(helpers.prepareBinaryData).not.toHaveBeenCalled();
			expect(message.content).toEqual(content);
		});
	});

	describe('rabbitmqConnect', () => {
		it('should connect to RabbitMQ', async () => {
			const connection = await rabbitmqConnect({ ...credentials, ssl: false });
			expect(connect).toHaveBeenCalledWith(credentials, {});
			expect(connection).toBe(mockConnection);
		});

		it('should connect to RabbitMQ over SSL', async () => {
			const connection = await rabbitmqConnect({
				...credentials,
				ssl: true,
				ca: 'ca',
				passwordless: false,
			});
			expect(connect).toHaveBeenCalledWith(
				{ ...credentials, protocol: 'amqps' },
				{ ca: [Buffer.from('ca')] },
			);
			expect(connection).toBe(mockConnection);
		});
	});

	describe('rabbitmqCreateChannel', () => {
		it('should create a channel', async () => {
			context.getCredentials.mockResolvedValue(credentials);
			const channel = await rabbitmqCreateChannel.call(context);
			expect(channel).toBe(mockChannel);
		});
	});

	describe('rabbitmqConnectQueue', () => {
		it('should assert a queue', async () => {
			context.getCredentials.mockResolvedValue(credentials);
			const options = mock<TriggerOptions>({ assertQueue: true });
			await rabbitmqConnectQueue.call(context, 'queue', options);

			expect(mockChannel.assertQueue).toHaveBeenCalledWith('queue', options);
			expect(mockChannel.checkQueue).not.toHaveBeenCalled();
			expect(mockChannel.bindQueue).not.toHaveBeenCalled();
		});

		it('should check a queue', async () => {
			context.getCredentials.mockResolvedValue(credentials);
			const options = mock<TriggerOptions>({ assertQueue: false });
			await rabbitmqConnectQueue.call(context, 'queue', options);

			expect(mockChannel.assertQueue).not.toHaveBeenCalled();
			expect(mockChannel.checkQueue).toHaveBeenCalledWith('queue');
			expect(mockChannel.bindQueue).not.toHaveBeenCalled();
		});
	});

	describe('rabbitmqConnectExchange', () => {
		it('should assert a queue', async () => {
			context.getCredentials.mockResolvedValue(credentials);
			context.getNodeParameter.calledWith('exchangeType', 0).mockReturnValue('topic');
			const options = mock<TriggerOptions>({ assertExchange: true });
			await rabbitmqConnectExchange.call(context, 'exchange', options);

			expect(mockChannel.assertExchange).toHaveBeenCalledWith('exchange', 'topic', options);
			expect(mockChannel.checkExchange).not.toHaveBeenCalled();
		});

		it('should check a queue', async () => {
			context.getCredentials.mockResolvedValue(credentials);
			const options = mock<TriggerOptions>({ assertExchange: false });
			await rabbitmqConnectExchange.call(context, 'exchange', options);

			expect(mockChannel.assertExchange).not.toHaveBeenCalled();
			expect(mockChannel.checkExchange).toHaveBeenCalledWith('exchange');
		});
	});

	describe('MessageTracker', () => {
		let messageTracker: MessageTracker;

		beforeEach(() => {
			messageTracker = new MessageTracker();
		});

		it('should track received messages', () => {
			const message = { fields: { deliveryTag: 1 } } as ConsumeMessage;
			messageTracker.received(message);
			expect(messageTracker.messages).toContain(1);
		});

		it('should track answered messages', () => {
			const message = { fields: { deliveryTag: 1 } } as ConsumeMessage;
			messageTracker.received(message);
			messageTracker.answered(message);
			expect(messageTracker.messages).not.toContain(1);
		});

		it('should return the number of unanswered messages', () => {
			const message = { fields: { deliveryTag: 1 } } as ConsumeMessage;
			messageTracker.received(message);
			expect(messageTracker.unansweredMessages()).toBe(1);
		});

		it('should close the channel and connection', async () => {
			await messageTracker.closeChannel(mockChannel, 'consumerTag');

			expect(mockChannel.cancel).toHaveBeenCalledWith('consumerTag');
			expect(mockChannel.close).toHaveBeenCalled();
			expect(mockConnection.close).toHaveBeenCalled();
		});
	});
});
