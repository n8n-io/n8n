import {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';

import {
	rabbitDefaultOptions,
} from './DefaultOptions';

import {
	rabbitmqConnectQueue,
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
				displayName: 'Queue / Topic',
				name: 'queue',
				type: 'string',
				default: '',
				placeholder: 'queue-name',
				description: 'Name of the queue to publish to.',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
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

		const startConsumer = async () => {
			await channel.consume(queue, async (message: IDataObject) => {
				if (message !== null) {
					let content: IDataObject | string = message!.content!.toString();

					const item: INodeExecutionData = {
						json: {},
					};

					if (options.contentIsBinary === true) {
						item.binary = {
							data: await this.helpers.prepareBinaryData(message.content),
						};

						item.json = message;
						message.content = undefined;
					} else {
						if (options.jsonParseBody === true) {
							content = JSON.parse(content as string);
						}
						if (options.onlyContent === true) {
							item.json = content as IDataObject;
						} else {
							message.content = content;
							item.json = message;
						}
					}

					self.emit([
						[
							item,
						],
					]);
					channel.ack(message);
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
