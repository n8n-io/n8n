import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	messageOptions,
} from './RabbitMQDescription';

import {
	fixOptions,
	rabbitmqConnect,
} from './GenericFunctions';

import * as amqplib from 'amqplib';

import {
	ChannelWrapper,
} from 'amqp-connection-manager';

export class RabbitMQ implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ',
		name: 'rabbitmq',
		icon: 'file:rabbitmq.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"] + ": " + ($parameter["queue"] || $parameter["exchange"])}}',
		description: 'Sends messages to a RabbitMQ topic',
		defaults: {
			name: 'RabbitMQ',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rabbitmq',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Queue',
						value: 'queue',
						description: 'Publish data to queue',
					},
					{
						name: 'Exchange',
						value: 'exchange',
						description: 'Publish data to exchange',
					},
				],
				default: 'queue',
				description: 'To where data should be moved',
			},

			// ----------------------------------
			//         Queue
			// ----------------------------------
			{
				displayName: 'Queue / Topic',
				name: 'queue',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['queue'],
					},
				},
				default: '',
				placeholder: 'queue-name',
				description: 'Name of the queue to publish to',
			},

			// ----------------------------------
			//         Exchange
			// ----------------------------------

			{
				displayName: 'Exchange',
				name: 'exchange',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['exchange'],
					},
				},
				default: '',
				placeholder: 'exchange-name',
				description: 'Name of the exchange to publish to',
			},
			{
				displayName: 'Type',
				name: 'exchangeType',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['exchange'],
					},
				},
				options: [
					{
						name: 'Direct',
						value: 'direct',
						description: 'Direct exchange type',
					},
					{
						name: 'Topic',
						value: 'topic',
						description: 'Topic exchange type',
					},
					{
						name: 'Headers',
						value: 'headers',
						description: 'Headers exchange type',
					},
					{
						name: 'Fanout',
						value: 'fanout',
						description: 'Fanout exchange type',
					},
				],
				default: 'fanout',
				description: 'Type of exchange',
			},
			{
				displayName: 'Routing Key',
				name: 'routingKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['exchange'],
					},
				},
				default: '',
				placeholder: 'routing-key',
				description: 'The routing key for the message',
			},

			// ----------------------------------
			//         Default
			// ----------------------------------

			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to send the the data the node receives as JSON',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						sendInputData: [false],
					},
				},
				default: '',
				description: 'The message to be sent',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Alternate Exchange',
						name: 'alternateExchange',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['exchange'],
							},
						},
						default: '',
						description:
							'An exchange to send messages to if this exchange can\'t route them to any queues',
					},
					{
						displayName: 'Arguments',
						name: 'arguments',
						placeholder: 'Add Argument',
						description: 'Arguments to add',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'argument',
								displayName: 'Argument',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Auto Delete Queue',
						name: 'autoDelete',
						type: 'boolean',
						default: false,
						description: 'Whether the queue will be deleted when the number of consumers drops to zero',
					},
					{
						displayName: 'Close Connection',
						name: 'closeConnection',
						type: 'boolean',
						default: false,
						description: 'Whether to close connection after execution',
					},
					{
						displayName: 'Durable',
						name: 'durable',
						type: 'boolean',
						default: true,
						description: 'Whether the queue will survive broker restarts',
					},
					{
						displayName: 'Exclusive',
						name: 'exclusive',
						type: 'boolean',
						displayOptions: {
							show: {
								'/mode': ['queue'],
							},
						},
						default: false,
						description: 'Whether to scope the queue to the connection',
					},
					{
						displayName: 'Headers',
						name: 'headers',
						placeholder: 'Add Header',
						description: 'Headers to add',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'header',
								displayName: 'Header',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
			messageOptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let setup: (channel: amqplib.Channel) => Promise<void>;

		let sendMessage: (
			channel: ChannelWrapper,
			itemIndex: number,
			message: [Buffer, amqplib.Options.Publish],
		) => Promise<boolean>;

		const mode = this.getNodeParameter('mode', 0);
		const options = fixOptions(this.getNodeParameter('options', 0, {}) as IDataObject);
		const closeConnection = this.getNodeParameter('options.closeConnection', 0, false) as boolean;

		if (mode === 'queue') {
			const queue = this.getNodeParameter('queue', 0) as string;

			setup = async (channel) => {
				await channel.assertQueue(queue, options);
			};

			sendMessage = async (channel, itemIndex, message) => {
				return channel.sendToQueue(queue, ...message);
			};
		} else if (mode === 'exchange') {
			const exchange = this.getNodeParameter('exchange', 0) as string;
			const type = this.getNodeParameter('exchangeType', 0) as string;

			setup = async (channel) => {
				await channel.assertExchange(exchange, type, options);
			};

			sendMessage = async (channel, itemIndex, message) => {
				const routingKey = this.getNodeParameter('routingKey', itemIndex) as string;
				return channel.publish(exchange, routingKey, ...message);
			};
		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`);
		}

		const self = this;
		const returnItems: INodeExecutionData[] = [];

		async function publishMessages() {
			await new Promise(async (resolve, reject) => {
				try {
					const [channel, connection] = await rabbitmqConnect(self, setup);

					connection.on('disconnect', ({ err }) => {
						if (err.message.includes('PRECONDITION-FAILED')) {
							reject(err);
						}
						if (err.message.includes('RESOURCE_LOCKED')) {
							reject(err);
						}
					});

					const sendPromises = items.map((item, itemIndex) => {
						const messageOptions = fixOptions(
							self.getNodeParameter('messageOptions', itemIndex, {}) as IDataObject,
						);

						let message: string;

						if (self.getNodeParameter('sendInputData', itemIndex)) {
							message = JSON.stringify(item.json);
							messageOptions.contentType = messageOptions.contentType || 'application/json';
							messageOptions.contentEncoding = messageOptions.contentEncoding || 'utf-8';
						} else {
							message = String(self.getNodeParameter('message', itemIndex));
						}
						return sendMessage(channel, itemIndex, [Buffer.from(message), messageOptions]);
					});

					// @ts-ignore
					const responses: RabbitmqResponse[] = await Promise.allSettled(sendPromises);

					responses.map((response) => {
						if (response!.status !== 'fulfilled') {
							if (self.continueOnFail() !== true) {
								throw new NodeApiError(self.getNode(), response.reason);
							} else {
								returnItems.push( {
									json: {
										error: response.reason?.message,
									},
								});
							}
						} else {
							returnItems.push({
								json: {
									success: response.value,
								},
							});
						}
					});
					await channel.close();

					if(closeConnection) {
						connection.close();
					}

					resolve(true);
				} catch (error) {
					reject(error);
				}
			});
		}

		try {
			await publishMessages();
			return this.prepareOutputData(returnItems);
		} catch (error) {
			throw new NodeApiError(self.getNode(), error);
		}
	}
}

type RabbitmqResponse = { status: 'fulfilled'; value: boolean } | { status: 'rejected'; reason: JsonObject };
