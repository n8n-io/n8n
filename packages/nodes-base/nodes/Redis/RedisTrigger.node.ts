import type { ITriggerFunctions } from 'n8n-core';

import type { IDataObject, INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import redis from 'redis';

export class RedisTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Redis Trigger',
		name: 'redisTrigger',
		icon: 'file:redis.svg',
		group: ['trigger'],
		version: 1,
		description: 'Subscribe to redis channel',
		defaults: {
			name: 'Redis Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'redis',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Channels',
				name: 'channels',
				type: 'string',
				default: '',
				required: true,
				description:
					'Channels to subscribe to, multiple channels be defined with comma. Wildcard character(*) is supported.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to try to parse the message to an object',
					},
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						default: false,
						description: 'Whether to return only the message property',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('redis');

		const redisOptions: redis.ClientOpts = {
			host: credentials.host as string,
			port: credentials.port as number,
			db: credentials.database as number,
		};

		if (credentials.password) {
			redisOptions.password = credentials.password as string;
		}

		const channels = (this.getNodeParameter('channels') as string).split(',');

		const options = this.getNodeParameter('options') as IDataObject;

		if (!channels) {
			throw new NodeOperationError(this.getNode(), 'Channels are mandatory!');
		}

		const client = redis.createClient(redisOptions);

		const manualTriggerFunction = async () => {
			await new Promise((resolve, reject) => {
				client.on('connect', () => {
					for (const channel of channels) {
						client.psubscribe(channel);
					}
					client.on('pmessage', (pattern: string, channel: string, message: string) => {
						if (options.jsonParseBody) {
							try {
								message = JSON.parse(message);
							} catch (error) {}
						}

						if (options.onlyMessage) {
							this.emit([this.helpers.returnJsonArray({ message })]);
							resolve(true);
							return;
						}

						this.emit([this.helpers.returnJsonArray({ channel, message })]);
						resolve(true);
					});
				});

				client.on('error', (error) => {
					reject(error);
				});
			});
		};

		if (this.getMode() === 'trigger') {
			await manualTriggerFunction();
		}

		async function closeFunction() {
			client.quit();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
