import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import * as amqplib from 'amqplib';

import * as nodeProperties from './nodeProperties';

import {
	fixAssertOptions,
	fixMessageOptions,
	isDataObject,
	rabbitmqConnect,
} from './GenericFunctions';

import { ChannelWrapper } from 'amqp-connection-manager';

export class RabbitMQ implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ',
		name: 'rabbitmq',
		icon: 'file:rabbitmq.png',
		group: ['transform'],
		version: 1,
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
						description: 'Publish data to queue.',
					},
					{
						name: 'Exchange',
						value: 'exchange',
						description: 'Publish data to exchange.',
					},
				],
				default: 'queue',
				description: 'To where data should be moved.',
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
						mode: [
							'queue',
						],
					},
				},
				default: '',
				placeholder: 'queue-name',
				description: 'Name of the queue to publish to.',
			},
			{
				...nodeProperties.queueOptions,
				displayOptions: {
					show: {
						mode: [
							'queue',
						],
					},
				},
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
						mode: [
							'exchange',
						],
					},
				},
				default: '',
				placeholder: 'exchange-name',
				description: 'Name of the exchange to publish to.',
			},
			{
				displayName: 'Type',
				name: 'exchangeType',
				type: 'options',
				displayOptions: {
					show: {
						mode: [
							'exchange',
						],
					},
				},
				options: [
					{
						name: 'Direct',
						value: 'direct',
						description: 'Direct exchange type.',
					},
					{
						name: 'Topic',
						value: 'topic',
						description: 'Topic exchange type.',
					},
					{
						name: 'Headers',
						value: 'headers',
						description: 'Headers exchange type.',
					},
					{
						name: 'Fanout',
						value: 'fanout',
						description: 'Fanout exchange type.',
					},
				],
				default: 'fanout',
				description: 'Type of exchange.',
			},
			{
				displayName: 'Routing key',
				name: 'routingKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'exchange',
						],
					},
				},
				default: '',
				placeholder: 'routing-key',
				description: 'The routing key for the message.',
			},
			{
				...nodeProperties.exchangeOptions,
				displayOptions: {
					show: {
						mode: [
							'exchange',
						],
					},
				},
			},

			// ----------------------------------
			//         Default
			// ----------------------------------

			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Send the data the node receives.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						sendInputData: [
							false,
						],
					},
				},
				default: '',
				description: 'The message to be sent.',
			},
			nodeProperties.messageOptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let setup: (channel: amqplib.Channel) => Promise<void>;
		let sendMessage: (
			channel: ChannelWrapper,
			i: number,
			message: [Buffer, amqplib.Options.Publish],
		) => Promise<boolean>;

		// determine setup and sendMessage functions based on mode
		const mode = this.getNodeParameter('mode', 0);
		if (mode === 'queue') {
			const queue = this.getNodeParameter('queue', 0) as string;
			const queueOptions = fixAssertOptions(
				this.getNodeParameter('queueOptions', 0, {}),
			);

			setup = async (channel) => {
				await channel.assertQueue(queue, queueOptions);
			};
			sendMessage = async (channel, i, message) => {
				return channel.sendToQueue(queue, ...message);
			};
		} else if (mode === 'exchange') {
			const exchange = this.getNodeParameter('exchange', 0) as string;
			const type = this.getNodeParameter('exchangeType', 0) as string;
			const exchangeOptions = fixAssertOptions(
				this.getNodeParameter('exchangeOptions', 0, {}),
			);

			setup = async (channel) => {
				await channel.assertExchange(exchange, type, exchangeOptions);
			};
			sendMessage = async (channel, i, message) => {
				const routingKey = this.getNodeParameter('routingKey', i) as string;
				return channel.publish(exchange, routingKey, ...message);
			};
		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`);
		}

		// open the channel and send all messages
		const channel = await rabbitmqConnect(this, setup);
		let responses: Array<{ status: 'fulfilled', value: boolean } | { status: 'rejected', reason: Error }>;
		try {
			const sendPromises = items.map((item, i) => {
				const options = fixMessageOptions(
					this.getNodeParameter('options', i, {}),
				);

				let message: string;
				if (this.getNodeParameter('sendInputData', i)) {
					message = JSON.stringify(item.json);
					options.contentType = options.contentType || 'application/json';
					options.contentEncoding = options.contentEncoding || 'utf-8';
				} else {
					message = String(this.getNodeParameter('message', i));
				}

				return sendMessage(channel, i, [Buffer.from(message), options]);
			});

			// @ts-ignore
			responses = await Promise.allSettled(sendPromises);
		} finally {
			await channel.close();
		}

		// process the responses
		const returnItems: INodeExecutionData[] = responses.map((response) => {
			if (response!.status !== 'fulfilled') {
				if (this.continueOnFail() !== true) {
					throw new NodeApiError(this.getNode(), {
						...response.reason,
					});
				} else {
					// Return the actual reason as error
					return {
						json: {
							error: response.reason,
						},
					};
				}
			}

			return {
				json: {
					success: response.value,
				},
			};
		});

		return this.prepareOutputData(returnItems);
	}
}
