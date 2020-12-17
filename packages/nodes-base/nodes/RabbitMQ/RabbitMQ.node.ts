import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

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
				displayName: 'Queue',
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
				options: [
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
						default: false,
						description: 'Scopes the queue to the connection.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let channel;
		try {
			const items = this.getInputData();

			const credentials = this.getCredentials('rabbitmq') as IDataObject;

			const credentialKeys = [
				'hostname',
				'port',
				'username',
				'password',
				'vhost',
			];
			const credentialData: IDataObject = {};
			credentialKeys.forEach(key => {
				credentialData[key] = credentials[key] === '' ? undefined : credentials[key];
			});

			const optsData: IDataObject = {};
			if (credentials.ssl === true) {
				credentialData.protocol = 'amqps';

				optsData.cert = credentials.cert === '' ? undefined : Buffer.from(credentials.cert as string);
				optsData.key = credentials.key === '' ? undefined : Buffer.from(credentials.key as string);
				optsData.passphrase = credentials.passphrase === '' ? undefined : credentials.passphrase;
				optsData.ca = credentials.ca === '' ? undefined : [Buffer.from(credentials.ca as string)];
				optsData.credentials = require('amqplib').credentials.external();
			}

			const connection = await require('amqplib').connect(credentialData, optsData);
			channel = await connection.createChannel();

			const queue = this.getNodeParameter('queue', 0) as string;

			const options = this.getNodeParameter('options', 0) as IDataObject;

			if (options.arguments && ((options.arguments as IDataObject).argument! as IDataObject[]).length) {
				const additionalArguments: IDataObject = {};
				((options.arguments as IDataObject).argument as IDataObject[]).forEach((argument: IDataObject) => {
					additionalArguments[argument.key as string] = argument.value;
				});
				options.arguments = additionalArguments;
			}

			// TODO: Throws error here I can not catch if for example arguments are missing
			await channel.assertQueue(queue, options);
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
			const promisesResponses = await Promise.allSettled(queuePromises)

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
						return;;
					}
				}

				returnItems.push({
					json: {
						success: response.value
					}
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
