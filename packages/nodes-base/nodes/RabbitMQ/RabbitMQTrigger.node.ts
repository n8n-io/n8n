/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { Message } from 'amqplib';
import type {
	IDeferredPromise,
	IExecuteResponsePromiseData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IRun,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { rabbitDefaultOptions } from './DefaultOptions';

import { MessageTracker, rabbitmqConnectQueue, parseMessage } from './GenericFunctions';
import type { TriggerOptions } from './types';

export class RabbitMQTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RabbitMQ Trigger',
		name: 'rabbitmqTrigger',
		icon: 'file:rabbitmq.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to RabbitMQ messages',
		eventTriggerDescription: '',
		defaults: {
			name: 'RabbitMQ Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger a Rabbit MQ event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger a Rabbit MQ event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
				placeholder: 'Add option',
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
							{
								name: 'Specified Later in Workflow',
								value: 'laterMessageNode',
								description: 'Using a RabbitMQ node to remove the item from the queue',
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
					{
						displayName: 'Binding',
						name: 'binding',
						placeholder: 'Add Binding',
						description: 'Add binding to queu',
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
										default: '',
										placeholder: 'exchange',
									},
									{
										displayName: 'RoutingKey',
										name: 'routingKey',
										type: 'string',
										default: '',
										placeholder: 'routing-key',
									},
								],
							},
						],
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
			{
				displayName:
					"To delete an item from the queue, insert a RabbitMQ node later in the workflow and use the 'Delete from queue' operation",
				name: 'laterMessageNode',
				type: 'notice',
				displayOptions: {
					show: {
						'/options.acknowledge': ['laterMessageNode'],
					},
				},
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const queue = this.getNodeParameter('queue') as string;
		const options = this.getNodeParameter('options', {}) as TriggerOptions;
		const channel = await rabbitmqConnectQueue.call(this, queue, options);

		if (this.getMode() === 'manual') {
			const manualTriggerFunction = async () => {
				// Do only catch a single message when executing manually, else messages will leak
				await channel.prefetch(1);

				const processMessage = async (message: Message | null) => {
					if (message !== null) {
						const item = await parseMessage(message, options, this.helpers);
						channel.ack(message);
						this.emit([[item]]);
					} else {
						this.emitError(new Error('Connection got closed unexpectedly'));
					}
				};

				const existingMessage = await channel.get(queue);
				if (existingMessage) await processMessage(existingMessage);
				else await channel.consume(queue, processMessage);
			};

			const closeFunction = async () => {
				await channel.close();
				await channel.connection.close();
				return;
			};

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}

		const parallelMessages = options.parallelMessages ?? -1;
		if (isNaN(parallelMessages) || parallelMessages === 0 || parallelMessages < -1) {
			throw new NodeOperationError(
				this.getNode(),
				'Parallel message processing limit must be a number greater than zero (or -1 for no limit)',
			);
		}

		let acknowledgeMode = options.acknowledge ?? 'immediately';

		if (parallelMessages !== -1 && acknowledgeMode === 'immediately') {
			// If parallel message limit is set, then the default mode is "executionFinishes"
			// unless acknowledgeMode got set specifically. Be aware that the mode "immediately"
			// can not be supported in this case.
			acknowledgeMode = 'executionFinishes';
		}

		const messageTracker = new MessageTracker();
		let closeGotCalled = false;

		if (parallelMessages !== -1) {
			await channel.prefetch(parallelMessages);
		}

		channel.on('close', () => {
			if (!closeGotCalled) {
				this.emitError(new Error('Connection got closed unexpectedly'));
			}
		});

		const consumerInfo = await channel.consume(queue, async (message) => {
			if (message !== null) {
				try {
					if (acknowledgeMode !== 'immediately') {
						messageTracker.received(message);
					}

					const item = await parseMessage(message, options, this.helpers);

					let responsePromise: IDeferredPromise<IRun> | undefined = undefined;
					let responsePromiseHook: IDeferredPromise<IExecuteResponsePromiseData> | undefined =
						undefined;
					if (acknowledgeMode !== 'immediately' && acknowledgeMode !== 'laterMessageNode') {
						responsePromise = this.helpers.createDeferredPromise();
					} else if (acknowledgeMode === 'laterMessageNode') {
						responsePromiseHook = this.helpers.createDeferredPromise<IExecuteResponsePromiseData>();
					}
					if (responsePromiseHook) {
						this.emit([[item]], responsePromiseHook, undefined);
					} else {
						this.emit([[item]], undefined, responsePromise);
					}
					if (responsePromise && acknowledgeMode !== 'laterMessageNode') {
						// Acknowledge message after the execution finished
						await responsePromise.promise.then(async (data: IRun) => {
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
					} else if (responsePromiseHook && acknowledgeMode === 'laterMessageNode') {
						await responsePromiseHook.promise.then(() => {
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

					this.logger.error(
						`There was a problem with the RabbitMQ Trigger node "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
						{
							node: node.name,
							workflowId: workflow.id,
						},
					);
				}
			}
		});
		const consumerTag = consumerInfo.consumerTag;

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		const closeFunction = async () => {
			closeGotCalled = true;
			try {
				return await messageTracker.closeChannel(channel, consumerTag);
			} catch (error) {
				const workflow = this.getWorkflow();
				const node = this.getNode();
				this.logger.error(
					`There was a problem closing the RabbitMQ Trigger node connection "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
					{
						node: node.name,
						workflowId: workflow.id,
					},
				);
			}
		};

		return {
			closeFunction,
		};
	}
}
