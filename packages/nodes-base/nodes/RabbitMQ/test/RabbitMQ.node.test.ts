import type { Channel, Connection } from 'amqplib';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

const mockChannel = mock<Channel>();
const mockConnection = mock<Connection>({ createChannel: async () => mockChannel });
mockChannel.connection = mockConnection;
const amqpConnect = jest.fn().mockReturnValue(mockConnection);
jest.mock('amqplib', () => ({ connect: amqpConnect }));

import { RabbitMQ } from '../RabbitMQ.node';

describe('RabbitMQ Node', () => {
	const executeFunctions = mock<IExecuteFunctions>();
	const credentials = {
		hostname: 'localhost',
		port: 5672,
		username: 'guest',
		password: 'guest',
		vhost: '/',
		ssl: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctions.getCredentials.calledWith('rabbitmq').mockResolvedValue(credentials);
	});

	describe('exchange mode', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.calledWith('operation', 0).mockReturnValue('sendMessage');
			executeFunctions.getNodeParameter.calledWith('mode', 0).mockReturnValue('exchange');
			executeFunctions.getNodeParameter.calledWith('exchange', 0).mockReturnValue('test.exchange');
			executeFunctions.getNodeParameter.calledWith('exchangeType', 0).mockReturnValue('topic');
			executeFunctions.getNodeParameter.calledWith('sendInputData', 0).mockReturnValue(true);
			executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});
			executeFunctions.getNodeParameter.calledWith('options', 0, {}).mockReturnValue({});
			mockChannel.publish.mockReturnValue(true);
			executeFunctions.continueOnFail.mockReturnValue(false);
		});

		it('should publish a single item to exchange with correct routing key', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: { msg: 'hello' } }]);
			executeFunctions.getNodeParameter.calledWith('routingKey', 0).mockReturnValue('key.alpha');

			const result = await new RabbitMQ().execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true } }]]);
			expect(mockChannel.publish).toHaveBeenCalledTimes(1);
			expect(mockChannel.publish).toHaveBeenCalledWith(
				'test.exchange',
				'key.alpha',
				Buffer.from(JSON.stringify({ msg: 'hello' })),
				{ headers: {} },
			);
			expect(mockChannel.close).toHaveBeenCalledTimes(1);
			expect(mockConnection.close).toHaveBeenCalledTimes(1);
		});

		it('should evaluate routingKey per item for multiple items', async () => {
			executeFunctions.getInputData.mockReturnValue([
				{ json: { seq: 1, _routingKey: 'key.alpha' } },
				{ json: { seq: 2, _routingKey: 'key.beta' } },
				{ json: { seq: 3, _routingKey: 'key.gamma' } },
			]);
			executeFunctions.getNodeParameter.calledWith('routingKey', 0).mockReturnValue('key.alpha');
			executeFunctions.getNodeParameter.calledWith('routingKey', 1).mockReturnValue('key.beta');
			executeFunctions.getNodeParameter.calledWith('routingKey', 2).mockReturnValue('key.gamma');

			const result = await new RabbitMQ().execute.call(executeFunctions);

			expect(result).toEqual([
				[{ json: { success: true } }, { json: { success: true } }, { json: { success: true } }],
			]);
			expect(mockChannel.publish).toHaveBeenCalledTimes(3);
			expect(mockChannel.publish).toHaveBeenNthCalledWith(
				1,
				'test.exchange',
				'key.alpha',
				Buffer.from(JSON.stringify({ seq: 1, _routingKey: 'key.alpha' })),
				{ headers: {} },
			);
			expect(mockChannel.publish).toHaveBeenNthCalledWith(
				2,
				'test.exchange',
				'key.beta',
				Buffer.from(JSON.stringify({ seq: 2, _routingKey: 'key.beta' })),
				{ headers: {} },
			);
			expect(mockChannel.publish).toHaveBeenNthCalledWith(
				3,
				'test.exchange',
				'key.gamma',
				Buffer.from(JSON.stringify({ seq: 3, _routingKey: 'key.gamma' })),
				{ headers: {} },
			);
		});

		it('should publish custom message per item in exchange mode', async () => {
			executeFunctions.getNodeParameter.calledWith('sendInputData', 0).mockReturnValue(false);
			executeFunctions.getInputData.mockReturnValue([{ json: { seq: 1 } }, { json: { seq: 2 } }]);
			executeFunctions.getNodeParameter.calledWith('routingKey', 0).mockReturnValue('rk.one');
			executeFunctions.getNodeParameter.calledWith('routingKey', 1).mockReturnValue('rk.two');
			executeFunctions.getNodeParameter.calledWith('message', 0).mockReturnValue('msg-one');
			executeFunctions.getNodeParameter.calledWith('message', 1).mockReturnValue('msg-two');

			const result = await new RabbitMQ().execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true } }, { json: { success: true } }]]);
			expect(mockChannel.publish).toHaveBeenNthCalledWith(
				1,
				'test.exchange',
				'rk.one',
				Buffer.from('msg-one'),
				{ headers: {} },
			);
			expect(mockChannel.publish).toHaveBeenNthCalledWith(
				2,
				'test.exchange',
				'rk.two',
				Buffer.from('msg-two'),
				{ headers: {} },
			);
		});
	});

	describe('queue mode', () => {
		beforeEach(() => {
			executeFunctions.getNodeParameter.calledWith('operation', 0).mockReturnValue('sendMessage');
			executeFunctions.getNodeParameter.calledWith('mode', 0).mockReturnValue('queue');
			executeFunctions.getNodeParameter.calledWith('queue', 0).mockReturnValue('test.queue');
			executeFunctions.getNodeParameter.calledWith('sendInputData', 0).mockReturnValue(true);
			executeFunctions.getNodeParameter.calledWith('options', 0).mockReturnValue({});
			executeFunctions.getNodeParameter.calledWith('options', 0, {}).mockReturnValue({});
			mockChannel.sendToQueue.mockReturnValue(true);
			executeFunctions.continueOnFail.mockReturnValue(false);
		});

		it('should publish input data to queue', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: { testing: true } }]);

			const result = await new RabbitMQ().execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true } }]]);
			expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
				'test.queue',
				Buffer.from(JSON.stringify({ testing: true })),
				{ headers: {} },
			);
		});

		it('should publish multiple items to queue', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: { seq: 1 } }, { json: { seq: 2 } }]);

			const result = await new RabbitMQ().execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true } }, { json: { success: true } }]]);
			expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(2);
		});
	});
});
