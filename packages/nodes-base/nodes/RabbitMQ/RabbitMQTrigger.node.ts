import {
	createDeferredPromise,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IRun,
	ITriggerFunctions,
	ITriggerResponse,
	LoggerProxy as Logger,
} from 'n8n-workflow';

import {
	rabbitDefaultOptions,
} from './DefaultOptions';

import {
	rabbitmqConnectQueue,
} from './GenericFunctions';

import * as amqplib from 'amqplib';

export class RabbitMQTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ Trigger',
		name: 'rabbitmqTrigger',
		icon: 'file:rabbitmq.png',
		group: ['trigger'],
		version: 1,
		description: 'Listens to RabbitMQ messages',
		defaults: {
			name: 'RabbitMQ Trigger',
		},
		inputs: [],
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
				description: 'Name of the queue to publish to',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Acknowledge',
						name: 'acknowledge',
						type: 'options',
						options: [
							{
								name: 'Execution finished',
								value: 'executionFinished',
								description: 'After the workflow execution finished. No matter if the execution was successful or not.',
							},
							{
								name: 'Execution finished successfully',
								value: 'executionFinishedSuccessfully',
								description: 'After the workflow execution finished successfully',
							},
							{
								name: 'Immediately',
								value: 'immediately',
								description: 'As soon as the message got received',
							},
						],
						default: 'immediately',
						description: 'When to acknowledge the message',
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
					{
						displayName: 'Concurrent Messages',
						name: 'concurrentMessages',
						type: 'number',
						default: -1,
						displayOptions: {
							hide: {
								acknowledge: [
									'immediately',
								],
							},
						},
						description: 'Maximum number of messages which get processed in parallel (-1 => unlimited). Messages will be acknowledged after the last node executed.',
					},
					{
						displayName: 'Content is Binary',
						name: 'contentIsBinary',
						type: 'boolean',
						default: false,
						description: 'Saves the content as binary',
					},
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						displayOptions: {
							hide: {
								contentIsBinary: [
									true,
								],
							},
						},
						default: false,
						description: 'Parse the body to an object',
					},
					{
						displayName: 'Only Content',
						name: 'onlyContent',
						type: 'boolean',
						displayOptions: {
							hide: {
								contentIsBinary: [
									true,
								],
							},
						},
						default: false,
						description: 'Returns only the content property',
					},
					...rabbitDefaultOptions,
				].sort((a, b) => {
					if ((a as INodeProperties).displayName.toLowerCase() < (b as INodeProperties).displayName.toLowerCase()) { return -1; }
					if ((a as INodeProperties).displayName.toLowerCase() > (b as INodeProperties).displayName.toLowerCase()) { return 1; }
					return 0;
				}) as INodeProperties[],
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const queue = this.getNodeParameter('queue') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const channel = await rabbitmqConnectQueue.call(this, queue, options);

		const self = this;

		const concurrentMessages = (options.concurrentMessages && options.concurrentMessages !== -1) ? parseInt(options.concurrentMessages as string, 10) : -1;
		const acknowledgeMode = options.acknowledge ? options.acknowledge : 'immediately';

		const startConsumer = async () => {
			if (concurrentMessages !== -1) {
				channel.prefetch(concurrentMessages);
			}

			await channel.consume(queue, async (message) => {
				if (message !== null) {
					try {
						let content: IDataObject | string = message!.content!.toString();

						const item: INodeExecutionData = {
							json: {},
						};

						if (options.contentIsBinary === true) {
							item.binary = {
								data: await this.helpers.prepareBinaryData(message.content),
							};

							item.json = message as unknown as IDataObject;
							message.content = undefined as unknown as Buffer;
						} else {
							if (options.jsonParseBody === true) {
								content = JSON.parse(content as string);
							}
							if (options.onlyContent === true) {
								item.json = content as IDataObject;
							} else {
								message.content = content as unknown as Buffer;
								item.json = message as unknown as IDataObject;
							}
						}

						let responsePromise = undefined;
						if (acknowledgeMode !== 'immediately') {
							responsePromise = await createDeferredPromise<IRun>();
						}

						self.emit([
							[
								item,
							],
						], undefined, responsePromise);

						if (responsePromise) {
							// Acknowledge message after the execution finished
							await responsePromise
							.promise()
							.then((data: IRun) => {
								if (data.data.resultData.error) {
									// The execution did fail
									if (acknowledgeMode === 'executionFinishedSuccessfully') {
										channel.nack(message);
										return;
									}
								}

								channel.ack(message);
						});
						} else {
							// Acknowledge message directly
							channel.ack(message);
						}

					} catch (error) {
						const workflow = this.getWorkflow();
						const node = this.getNode();

						Logger.error(`There was a problem with the RabbitMQ Trigger node "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
							{
								node: node.name,
								workflowId: workflow.id,
							},
						);
					}
				}
			});
		};

		startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			await channel.close();
			await channel.connection.close();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
			startConsumer();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}

}
