import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { RedisCredential } from './types';
import { redisConnectionTest, setupRedisClient } from './utils';

interface Options {
	jsonParseBody: boolean;
	onlyMessage: boolean;
}

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
		outputs: [NodeConnectionTypes.Main],
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
				placeholder: 'Add option',
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
		const credentials = await this.getCredentials<RedisCredential>('redis');

		const channels = (this.getNodeParameter('channels') as string).split(',');
		const options = this.getNodeParameter('options') as Options;

		if (!channels) {
			throw new NodeOperationError(this.getNode(), 'Channels are mandatory!');
		}

		const client = setupRedisClient(credentials);
		await client.connect();
		await client.ping();

		const onMessage = (message: string, channel: string) => {
			if (options.jsonParseBody) {
				try {
					message = JSON.parse(message);
				} catch (error) {}
			}

			const data = options.onlyMessage ? { message } : { channel, message };
			this.emit([this.helpers.returnJsonArray(data)]);
		};

		const manualTriggerFunction = async () =>
			await new Promise<void>(async (resolve) => {
				await client.pSubscribe(channels, (message, channel) => {
					onMessage(message, channel);
					resolve();
				});
			});

		if (this.getMode() === 'trigger') {
			await client.pSubscribe(channels, onMessage);
		}

		async function closeFunction() {
			await client.pUnsubscribe();
			await client.quit();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
