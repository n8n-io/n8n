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
	MessageTracker,
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
						description: 'Maximum number of messages which get processed in parallel (-1 => unlimited). Messages will be acknowledged after the execution finished, no matter if successful or not unless overwritten with "Acknowledge".',
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

		let concurrentMessages = (options.concurrentMessages && options.concurrentMessages !== -1) ? parseInt(options.concurrentMessages as string, 10) : -1;

		if (this.getMode() === 'manual') {
			// Do only catch a single message when executing manually, else messages will leak
			concurrentMessages = 1;
		}

		let acknowledgeMode = options.acknowledge ? options.acknowledge : 'immediately';

		if (concurrentMessages !== -1 && acknowledgeMode === 'immediately') {
			// If concurrent message limit is set, then the default mode is "executionFinished"
			// unless acknowledgeMode got set specifically as "immediately" can not be supported
			acknowledgeMode = 'executionFinished';
		}

		const messageTracker = new MessageTracker();
		let consumerTag: string;

		const startConsumer = async () => {
			if (concurrentMessages !== -1) {
				channel.prefetch(concurrentMessages);
			}

			const consumerInfo = await channel.consume(queue, async (message) => {
				if (message !== null) {

					try {
						if (acknowledgeMode !== 'immediately') {
							messageTracker.received(message);
						}

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
							.then(async (data: IRun) => {
								if (data.data.resultData.error) {
									// The execution did fail
									if (acknowledgeMode === 'executionFinishedSuccessfully') {
										channel.nack(message);
										messageTracker.answered(message);
										return;
									}
								}

								channel.ack(message);
								messageTracker.answered(message);
							});
						} else {
							// Acknowledge message directly
							channel.ack(message);
						}

					} catch (error) {
						const workflow = this.getWorkflow();
						const node = this.getNode();
						if (acknowledgeMode !== 'immediately') {
							messageTracker.answered(message);
						}

						Logger.error(`There was a problem with the RabbitMQ Trigger node "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
							{
								node: node.name,
								workflowId: workflow.id,
							},
						);
					}
				}
			});
			consumerTag = consumerInfo.consumerTag;
		};

		startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {

			try {
				return messageTracker.closeChannel(channel, consumerTag);
			} catch(error) {
				const workflow = self.getWorkflow();
				const node = self.getNode();
				Logger.error(`There was a problem closing the RabbitMQ Trigger node connection "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
					{
						node: node.name,
						workflowId: workflow.id,
					},
				);
			}
		}

		return {
			closeFunction,
		};
	}

}
