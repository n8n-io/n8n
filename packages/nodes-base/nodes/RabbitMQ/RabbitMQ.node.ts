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

import {
	rabbitmqConnectExchange,
	rabbitmqConnectQueue,
} from './GenericFunctions';

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

			// ----------------------------------
			//         Default
			// ----------------------------------

			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Send the the data the node receives as JSON.',
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
								'/mode': [
									'exchange',
								],
							},
						},
						default: '',
						description: 'An exchange to send messages to if this exchange can’t route them to any queues',
					},
					{
						displayName: 'Arguments',
						name: 'arguments',
						placeholder: 'Add Argument',
						description: 'Arguments to add.',
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
						displayName: 'Auto Delete',
						name: 'autoDelete',
						type: 'boolean',
						default: false,
						description: 'The queue will be deleted when the number of consumers drops to zero .',
					},
					{
						displayName: 'Durable',
						name: 'durable',
						type: 'boolean',
						default: true,
						description: 'The queue will survive broker restarts.',
					},
					{
						displayName: 'Exclusive',
						name: 'exclusive',
						type: 'boolean',
						displayOptions: {
							show: {
								'/mode': [
									'queue',
								],
							},
						},
						default: false,
						description: 'Scopes the queue to the connection.',
					},
					{
						displayName: 'Headers',
						name: 'headers',
						placeholder: 'Add Header',
						description: 'Headers to add.',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let channel, options: IDataObject;
		try {
			const items = this.getInputData();
			const mode = this.getNodeParameter('mode', 0) as string;

			const returnItems: INodeExecutionData[] = [];

			if (mode === 'queue') {
				const queue = this.getNodeParameter('queue', 0) as string;

				options = this.getNodeParameter('options', 0, {}) as IDataObject;

				channel = await rabbitmqConnectQueue.call(this, queue, options);

				const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

				let message: string;

				const queuePromises = [];
				for (let i = 0; i < items.length; i++) {
					if (sendInputData === true) {
						message = JSON.stringify(items[i].json);
					} else {
						message = this.getNodeParameter('message', i) as string;
					}

					let headers: IDataObject = {};
					if (options.headers && ((options.headers as IDataObject).header! as IDataObject[]).length) {
						const itemOptions = this.getNodeParameter('options', i, {}) as IDataObject;
						const additionalHeaders: IDataObject = {};
						((itemOptions.headers as IDataObject).header as IDataObject[]).forEach((header: IDataObject) => {
							additionalHeaders[header.key as string] = header.value;
						});
						headers = additionalHeaders;
					}

					queuePromises.push(channel.sendToQueue(queue, Buffer.from(message), { headers }));
				}

				// @ts-ignore
				const promisesResponses = await Promise.allSettled(queuePromises);

				promisesResponses.forEach((response: JsonObject) => {
					if (response!.status !== 'fulfilled') {

						if (this.continueOnFail() !== true) {
							throw new NodeApiError(this.getNode(), response);
						} else {
							// Return the actual reason as error
							returnItems.push(
								{
									json: {
										error: response.reason,
									},
								},
							);
							return;
						}
					}

					returnItems.push({
						json: {
							success: response.value,
						},
					});
				});

				await channel.close();
				await channel.connection.close();
			}
			else if (mode === 'exchange') {
				const exchange = this.getNodeParameter('exchange', 0) as string;
				const type = this.getNodeParameter('exchangeType', 0) as string;
				const routingKey = this.getNodeParameter('routingKey', 0) as string;

				options = this.getNodeParameter('options', 0, {}) as IDataObject;

				channel = await rabbitmqConnectExchange.call(this, exchange, type, options);

				const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

				let message: string;

				const exchangePromises = [];
				for (let i = 0; i < items.length; i++) {
					if (sendInputData === true) {
						message = JSON.stringify(items[i].json);
					} else {
						message = this.getNodeParameter('message', i) as string;
					}

					let headers: IDataObject = {};
					if (options.headers && ((options.headers as IDataObject).header! as IDataObject[]).length) {
						const itemOptions = this.getNodeParameter('options', i, {}) as IDataObject;
						const additionalHeaders: IDataObject = {};
						((itemOptions.headers as IDataObject).header as IDataObject[]).forEach((header: IDataObject) => {
							additionalHeaders[header.key as string] = header.value;
						});
						headers = additionalHeaders;
					}

					exchangePromises.push(channel.publish(exchange, routingKey, Buffer.from(message), { headers }));
				}

				// @ts-ignore
				const promisesResponses = await Promise.allSettled(exchangePromises);

				promisesResponses.forEach((response: JsonObject) => {
					if (response!.status !== 'fulfilled') {

						if (this.continueOnFail() !== true) {
							throw new NodeApiError(this.getNode(), response);
						} else {
							// Return the actual reason as error
							returnItems.push(
								{
									json: {
										error: response.reason,
									},
								},
							);
							return;
						}
					}

					returnItems.push({
						json: {
							success: response.value,
						},
					});
				});

				await channel.close();
				await channel.connection.close();
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`);
			}

			return this.prepareOutputData(returnItems);
		}
		catch (error) {
			if (channel) {
				await channel.close();
				await channel.connection.close();
			}
			throw error;
		}
	}
}
