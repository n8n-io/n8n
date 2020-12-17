import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	rabbitDefaultOptions,
} from './DefaultOptions';

import {
	rabbitmqConnect,
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
			color: '#ff6600',
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
				displayName: 'Queue / Topic',
				name: 'queue',
				type: 'string',
				default: '',
				placeholder: 'queue-name',
				description: 'Name of the queue to publish to.',
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Send the the data the node receives as JSON to Kafka.',
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
				options: rabbitDefaultOptions,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let channel;
		try {
			const items = this.getInputData();

			const queue = this.getNodeParameter('queue', 0) as string;

			const options = this.getNodeParameter('options', 0, {}) as IDataObject;

			channel = await rabbitmqConnect.call(this, queue, options);

			const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

			let message: string;

			const queuePromises = [];
			for (let i = 0; i < items.length; i++) {
				if (sendInputData === true) {
					message = JSON.stringify(items[i].json);
				} else {
					message = this.getNodeParameter('message', i) as string;
				}

				queuePromises.push(channel.sendToQueue(queue, Buffer.from(message)));
			}

			// @ts-ignore
			const promisesResponses = await Promise.allSettled(queuePromises);

			const returnItems: INodeExecutionData[] = [];

			promisesResponses.forEach((response: IDataObject) => {
				if (response!.status !== 'fulfilled') {

					if (this.continueOnFail() !== true) {
						throw new Error(response!.reason as string);
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

			return this.prepareOutputData(returnItems);
		} catch (error) {
			if (channel) {
				await channel.close();
			}
			throw error;
		}
	}
}
