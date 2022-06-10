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
} from './RabbitMQDescription';

import {
	fixOptions,
	MessageTracker,
	rabbitmqConnect,
} from './GenericFunctions';

export class RabbitMQTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ Trigger',
		name: 'rabbitmqTrigger',
		icon: 'file:rabbitmq.svg',
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
				displayName: 'Subscriptions',
				name: 'subscriptions',
				placeholder: 'Bind to Exchange',
				description: 'Bind the queue to an exchange or subscribe to a topic',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'bindings',
						displayName: 'Binding',
						values: [
							{
								displayName: 'Exchange',
								name: 'exchange',
								type: 'string',
								default: 'amq.topic',
							},
							{
								displayName: 'Routing Pattern',
								name: 'pattern',
								placeholder: '*.orange.*',
								type: 'string',
								default: '',
							},
						],
					},
				],
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
								description: 'After the workflow execution finished. No matter if the execution was successful or not.',
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
								contentIsBinary: [
									true,
								],
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
								contentIsBinary: [
									true,
								],
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
								acknowledge: [
									'immediately',
								],
							},
						},
						description: 'Max number of executions at a time. Use -1 for no limit.',
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
		const options = fixOptions(this.getNodeParameter('options', {}) as IDataObject);
		const closeConnection = this.getNodeParameter('options.closeConnection', false) as boolean;

		const bindings = this.getNodeParameter('subscriptions.bindings', []) as IDataObject[];

		let parallelMessages = (options.parallelMessages !== undefined && options.parallelMessages !== -1) ? parseInt(options.parallelMessages as string, 10) : 65535; //It must be >= 0 and <= 65535

		if (parallelMessages === 0 || parallelMessages < -1) {
			throw new Error('Parallel message processing limit must be greater than zero (or -1 for no limit)');
		}

		if (this.getMode() === 'manual') {
			// Do only catch a single message when executing manually, else messages will leak
			parallelMessages = 1;
		}

		const [channel, connection] = await rabbitmqConnect(this, async (channel) => {
			await channel.assertQueue(queue, options);
			await channel.prefetch(parallelMessages);
			for (const { exchange, pattern } of bindings) {
				await channel.bindQueue(queue, exchange as string, pattern as string);
			}
		});

		const self = this;

		let acknowledgeMode = options.acknowledge ? options.acknowledge : 'immediately';

		if (parallelMessages !== -1 && acknowledgeMode === 'immediately') {
			// If parallel message limit is set, then the default mode is "executionFinishes"
			// unless acknowledgeMode got set specifically. Be aware that the mode "immediately"
			// can not be supported in this case.
			acknowledgeMode = 'executionFinishes';
		}

		const messageTracker = new MessageTracker();

		const startConsumer = async () => {
			await channel.consume(queue, async (message) => {
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
			try {
				if(closeConnection) {
					connection.close();
				}
				return messageTracker.closeChannel(channel);
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
