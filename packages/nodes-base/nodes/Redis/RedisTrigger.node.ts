/* eslint-disable @typescript-eslint/no-loop-func */
import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { redisConnectionTest, setupRedisClient } from './utils';

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
				testedBy: 'redisConnectionTest',
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

	methods = {
		credentialTest: { redisConnectionTest },
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('redis');

		const channels = (this.getNodeParameter('channels') as string).split(',');
		const options = this.getNodeParameter('options') as IDataObject;

		if (!channels) {
			throw new NodeOperationError(this.getNode(), 'Channels are mandatory!');
		}

		const client = setupRedisClient(credentials);

		const manualTriggerFunction = async () => {
			await client.connect();
			await client.ping();

			try {
				for (const channel of channels) {
					await client.pSubscribe(channel, (message) => {
						if (options.jsonParseBody) {
							try {
								message = JSON.parse(message);
							} catch (error) {}
						}

						if (options.onlyMessage) {
							this.emit([this.helpers.returnJsonArray({ message })]);
							return;
						}

						this.emit([this.helpers.returnJsonArray({ channel, message })]);
					});
				}
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error);
			}
		};

		if (this.getMode() === 'trigger') {
			void manualTriggerFunction();
		}

		async function closeFunction() {
			await client.quit();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
