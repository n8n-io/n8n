/* eslint-disable n8n-nodes-base/node-filename-against-convention */
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
	NodeOperationError,
} from 'n8n-workflow';

import { rabbitDefaultOptions } from './DefaultOptions';

import { MessageTracker, rabbitmqConnectQueue } from './GenericFunctions';

export class RabbitMQTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ Trigger',
		name: 'rabbitmqTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
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
				description: 'The name of the queue to read from',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Content Is Binary',
						name: 'contentIsBinary',
						type: 'boolean',
						default: false,
						description: 'Whether to save the content as binary',
					},
					{
						displayName: 'Delete From Queue When',
						name: 'acknowledge',
						type: 'options',
						options: [
							{
								name: 'Execution Finishes',
								value: 'executionFinishes',
								description:
									'After the workflow execution finished. No matter if the execution was successful or not.',
							},
							{
								name: 'Execution Finishes Successfully',
								value: 'executionFinishesSuccessfully',
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
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						displayOptions: {
							hide: {
								contentIsBinary: [true],
							},
						},
						default: false,
						description: 'Whether to parse the body to an object',
					},
					{
						displayName: 'Only Content',
						name: 'onlyContent',
						type: 'boolean',
						displayOptions: {
							hide: {
								contentIsBinary: [true],
							},
						},
						default: false,
						description: 'Whether to return only the content property',
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
					{
						displayName: 'Parallel Message Processing Limit',
						name: 'parallelMessages',
						type: 'number',
						default: -1,
						displayOptions: {
							hide: {
								acknowledge: ['immediately'],
							},
						},
						description: 'Max number of executions at a time. Use -1 for no limit.',
					},
					...rabbitDefaultOptions,
				].sort((a, b) => {
					if (
						(a as INodeProperties).displayName.toLowerCase() <
						(b as INodeProperties).displayName.toLowerCase()
					) {
						return -1;
					}
					if (
						(a as INodeProperties).displayName.toLowerCase() >
						(b as INodeProperties).displayName.toLowerCase()
					) {
						return 1;
					}
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

		let parallelMessages =
			options.parallelMessages !== undefined && options.parallelMessages !== -1
				? parseInt(options.parallelMessages as string, 10)
				: -1;

		if (parallelMessages === 0 || parallelMessages < -1) {
			throw new NodeOperationError(
				this.getNode(),
				'Parallel message processing limit must be greater than zero (or -1 for no limit)',
			);
		}

		if (this.getMode() === 'manual') {
			// Do only catch a single message when executing manually, else messages will leak
			parallelMessages = 1;
		}

		let acknowledgeMode = options.acknowledge ? options.acknowledge : 'immediately';

		if (parallelMessages !== -1 && acknowledgeMode === 'immediately') {
			// If parallel message limit is set, then the default mode is "executionFinishes"
			// unless acknowledgeMode got set specifically. Be aware that the mode "immediately"
			// can not be supported in this case.
			acknowledgeMode = 'executionFinishes';
		}

		const messageTracker = new MessageTracker();
		let consumerTag: string;
		let closeGotCalled = false;

		const startConsumer = async () => {
			if (parallelMessages !== -1) {
				channel.prefetch(parallelMessages);
			}

			channel.on('close', () => {
				if (!closeGotCalled) {
					self.emitError(new Error('Connection got closed unexpectedly'));
				}
			});

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

						self.emit([[item]], undefined, responsePromise);

						if (responsePromise) {
							// Acknowledge message after the execution finished
							await responsePromise.promise().then(async (data: IRun) => {
								if (data.data.resultData.error) {
									// The execution did fail
									if (acknowledgeMode === 'executionFinishesSuccessfully') {
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

						Logger.error(
							`There was a problem with the RabbitMQ Trigger node "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
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
			closeGotCalled = true;
			try {
				return messageTracker.closeChannel(channel, consumerTag);
			} catch (error) {
				const workflow = self.getWorkflow();
				const node = self.getNode();
				Logger.error(
					`There was a problem closing the RabbitMQ Trigger node connection "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
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
