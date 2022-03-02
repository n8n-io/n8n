import {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';

import { ConsumeMessage } from 'amqplib';

import * as nodeProperties from './nodeProperties';

import {
	fixAssertOptions,
	isDataObject,
	rabbitmqConnect,
} from './GenericFunctions';

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
				displayName: 'Queue',
				name: 'queue',
				type: 'string',
				default: '',
				placeholder: 'queue-name',
				description: 'Name of the queue to publish to.',
			},
			nodeProperties.queueOptions,
			{
				displayName: 'Subscriptions',
				name: 'subscriptions',
				placeholder: 'Bind to Exchange',
				description: 'Bind the queue to an exchange or subscribe to a topic. (IMPORTANT: bindings are not removed when deactivated)',
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
				displayName: 'Trigger Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Trigger Option',
				options: [
					{
						displayName: 'Prefetch count',
						name: 'prefetch',
						type: 'number',
						default: 100,
						description: 'Number of messages to fetch at a time',
					},
					{
						displayName: 'Content is Binary',
						name: 'contentIsBinary',
						type: 'boolean',
						default: false,
						description: 'Saves the content as binary.',
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
						description: 'Parse the body to an object.',
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
						description: 'Returns only the content property.',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const queue = String(this.getNodeParameter('queue'));
		const queueOptions = fixAssertOptions(
			this.getNodeParameter('queueOptions', {}),
		);

		const options = this.getNodeParameter('options', {});
		if (!isDataObject(options)) {
			throw new Error('Unexpected type for options');
		}
		const subscriptions = this.getNodeParameter('subscriptions', {});
		const bindings: IDataObject[] = [];
		if (isDataObject(subscriptions) && Array.isArray(subscriptions.bindings)) {
			for (const binding of subscriptions.bindings) {
				if (isDataObject(binding)) {
					bindings.push(binding);
				}
			}
		}

		const channel = await rabbitmqConnect(this, async (channel) => {
			await channel.assertQueue(queue, queueOptions);
			await channel.prefetch(Number(options?.prefetch || 100));
			for (const { exchange, pattern } of bindings) {
				await channel.bindQueue(queue, String(exchange), String(pattern));
			}
			// we can't unbind other exchanges because amqp doesn't expose a listing
		});

		const handler = async (message: ConsumeMessage) => {
			if (message !== null) {
				messageToItem(this, message, options)
					.then(item => {
						this.emit([ [ item ] ]);
						channel.ack(message);
					})
					.catch(error => {
						console.error(`Error consuming RabbitMQ message: ${error.message || error}`);
						// TODO should we nack it? It probably won't succeed on a reattempt, but it wasn't successful either
						// FIXME how do we report a failure to the ux?
						// channel.nack(message);
					})
				;
			}
		};

		const startConsumer = () => channel.consume(queue, handler);
		if (this.getActivationMode() !== 'manual') {
			await startConsumer();
		}

		return {
			// The "closeFunction" function gets called by n8n whenever
			// the workflow gets deactivated and can so clean up.
			async closeFunction() {
				await channel.close();
			},

			// The "manualTriggerFunction" function gets called by n8n
			// when a user is in the workflow editor and starts the
			// workflow manually. So the function has to make sure that
			// the emit() gets called with similar data like when it
			// would trigger by itself so that the user knows what data
			// to expect.
			async manualTriggerFunction() {
				await startConsumer();
			},
		};
	}
}

/** Transform a RabbitMQ message to an N8n item */
async function messageToItem(
	{ helpers }: ITriggerFunctions,
	message: ConsumeMessage,
	options: IDataObject,
): Promise<INodeExecutionData> {
	const contentType: string[] | undefined = message?.properties?.contentType?.toLowerCase()?.split(/; ?/);
	const mimeType = contentType?.[0];

	if (options.contentIsBinary === true) {
		const { content, ...context } = message;
		const data = await helpers.prepareBinaryData(content, undefined, mimeType);
		return {
			binary: { data },
			json: { ...context },
		};
	}

	let content = message.content instanceof Buffer
		? String(message.content)
		: message.content;
	if (typeof content === 'string') {
		if (isJsonMimeType(mimeType) || options.jsonParseBody === true) {
			content = JSON.parse(content);
		}
	}

	return {
		json: (options.onlyContent === true && isDataObject(content))
			? content
			: { ...message, content },
	};
}

function isJsonMimeType(mimeType: string | undefined): boolean {
	return !!mimeType && (['application/json', 'text/json'].includes(mimeType) || mimeType.endsWith('+json'));
}
