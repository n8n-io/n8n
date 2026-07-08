import type { Channel, Connection } from 'amqplib';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { RabbitMQ } from '../RabbitMQ.node';

describe('RabbitMQ node', () => {
	const node = new RabbitMQ();
	const mockChannel = mock<Channel>();
	const mockConnection = mock<Connection>();

	mockChannel.connection = mockConnection;

	const buildExecuteFunctions = (typeVersion: number) => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const inputItems = [{ json: { seq: 1 } }, { json: { seq: 2 } }, { json: { seq: 3 } }];

		executeFunctions.getInputData.mockReturnValue(inputItems);
		executeFunctions.getNode.mockReturnValue({
			id: 'node-id',
			name: 'RabbitMQ',
			type: 'n8n-nodes-base.rabbitmq',
			typeVersion,
			position: [0, 0],
			parameters: {},
		} as INode);
		executeFunctions.continueOnFail.mockReturnValue(false);
		executeFunctions.getNodeParameter.mockImplementation(
			(parameterName, itemIndex, fallbackValue) => {
				switch (parameterName) {
					case 'operation':
						return 'sendMessage';
					case 'mode':
						return 'exchange';
					case 'exchange':
						return 'test.exchange';
					case 'sendInputData':
						return true;
					case 'options':
						return {};
					case 'routingKey':
						if (itemIndex === 0) return 'key.alpha';
						if (itemIndex === 1) return 'key.beta';
						if (itemIndex === 2) return 'key.gamma';
						return 'key.alpha';
					default:
						return fallbackValue;
				}
			},
		);

		return { executeFunctions, inputItems };
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockChannel.publish.mockReturnValue(true);
		vi.spyOn(GenericFunctions, 'rabbitmqConnectExchange').mockResolvedValue(mockChannel);
	});

	it('includes node version 1.2 and exposes operation selector for it', () => {
		expect(node.description.version).toContain(1.2);

		const visibleOperation = node.description.properties.find(
			(property) => property.name === 'operation' && property.type === 'options',
		);
		expect(visibleOperation?.displayOptions?.show?.['@version']).toEqual([{ _cnd: { gte: 1.1 } }]);
	});

	it('keeps v1.1 exchange routing key resolution on item 0', async () => {
		const { executeFunctions, inputItems } = buildExecuteFunctions(1.1);

		await node.execute.call(executeFunctions);

		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			1,
			'test.exchange',
			'key.alpha',
			Buffer.from(JSON.stringify(inputItems[0].json)),
			{ headers: {} },
		);
		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			2,
			'test.exchange',
			'key.alpha',
			Buffer.from(JSON.stringify(inputItems[1].json)),
			{ headers: {} },
		);
		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			3,
			'test.exchange',
			'key.alpha',
			Buffer.from(JSON.stringify(inputItems[2].json)),
			{ headers: {} },
		);
		expect(executeFunctions.getNodeParameter).not.toHaveBeenCalledWith('routingKey', 1);
		expect(executeFunctions.getNodeParameter).not.toHaveBeenCalledWith('routingKey', 2);
	});

	it('evaluates exchange routing key per item in v1.2', async () => {
		const { executeFunctions, inputItems } = buildExecuteFunctions(1.2);

		await node.execute.call(executeFunctions);

		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			1,
			'test.exchange',
			'key.alpha',
			Buffer.from(JSON.stringify(inputItems[0].json)),
			{ headers: {} },
		);
		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			2,
			'test.exchange',
			'key.beta',
			Buffer.from(JSON.stringify(inputItems[1].json)),
			{ headers: {} },
		);
		expect(mockChannel.publish).toHaveBeenNthCalledWith(
			3,
			'test.exchange',
			'key.gamma',
			Buffer.from(JSON.stringify(inputItems[2].json)),
			{ headers: {} },
		);
		expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('routingKey', 0);
		expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('routingKey', 1);
		expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('routingKey', 2);
	});
});
