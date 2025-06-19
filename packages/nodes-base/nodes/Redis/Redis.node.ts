import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { RedisCredential } from './types';
import {
	setupRedisClient,
	redisConnectionTest,
	convertInfoToObject,
	getValue,
	setValue,
} from './utils';

export class Redis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Redis',
		name: 'redis',
		icon: 'file:redis.svg',
		group: ['input'],
		version: 1,
		description: 'Get, send and update data in Redis',
		defaults: {
			name: 'Redis',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'redis',
				required: true,
				testedBy: 'redisConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a key from Redis',
						action: 'Delete a key from Redis',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the value of a key from Redis',
						action: 'Get the value of a key from Redis',
					},
					{
						name: 'Increment',
						value: 'incr',
						description: 'Atomically increments a key by 1. Creates the key if it does not exist.',
						action: 'Atomically increment a key by 1. Creates the key if it does not exist.',
					},
					{
						name: 'Info',
						value: 'info',
						description: 'Returns generic information about the Redis instance',
						action: 'Return generic information about the Redis instance',
					},
					{
						name: 'Keys',
						value: 'keys',
						description: 'Returns all the keys matching a pattern',
						action: 'Return all keys matching a pattern',
					},
					{
						name: 'Pop',
						value: 'pop',
						description: 'Pop data from a redis list',
						action: 'Pop data from a redis list',
					},
					{
						name: 'Publish',
						value: 'publish',
						description: 'Publish message to redis channel',
						action: 'Publish message to redis channel',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Push data to a redis list',
						action: 'Push data to a redis list',
					},
					{
						name: 'Set',
						value: 'set',
						description: 'Set the value of a key in redis',
						action: 'Set the value of a key in redis',
					},
				],
				default: 'info',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to delete from Redis',
			},

			// ----------------------------------
			//         get
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'propertyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				default: 'propertyName',
				required: true,
				description:
					'Name of the property to write received data to. Supports dot-notation. Example: "data.person[0].name".',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to get from Redis',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				options: [
					{
						name: 'Automatic',
						value: 'automatic',
						description: 'Requests the type before requesting the data (slower)',
					},
					{
						name: 'Hash',
						value: 'hash',
						description: "Data in key is of type 'hash'",
					},
					{
						name: 'List',
						value: 'list',
						description: "Data in key is of type 'lists'",
					},
					{
						name: 'Sets',
						value: 'sets',
						description: "Data in key is of type 'sets'",
					},
					{
						name: 'String',
						value: 'string',
						description: "Data in key is of type 'string'",
					},
				],
				default: 'automatic',
				description: 'The type of the key to get',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>.',
					},
				],
			},

			// ----------------------------------
			//         incr
			// ----------------------------------
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['incr'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to increment',
			},
			{
				displayName: 'Expire',
				name: 'expire',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['incr'],
					},
				},
				default: false,
				description: 'Whether to set a timeout on key',
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						operation: ['incr'],
						expire: [true],
					},
				},
				default: 60,
				description: 'Number of seconds before key expiration',
			},

			// ----------------------------------
			//         keys
			// ----------------------------------
			{
				displayName: 'Key Pattern',
				name: 'keyPattern',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['keys'],
					},
				},
				default: '',
				required: true,
				description: 'The key pattern for the keys to return',
			},
			{
				displayName: 'Get Values',
				name: 'getValues',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['keys'],
					},
				},
				default: true,
				description: 'Whether to get the value of matching keys',
			},
			// ----------------------------------
			//         set
			// ----------------------------------
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to set in Redis',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				default: '',
				description: 'The value to write in Redis',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				options: [
					{
						name: 'Automatic',
						value: 'automatic',
						description: 'Tries to figure out the type automatically depending on the data',
					},
					{
						name: 'Hash',
						value: 'hash',
						description: "Data in key is of type 'hash'",
					},
					{
						name: 'List',
						value: 'list',
						description: "Data in key is of type 'lists'",
					},
					{
						name: 'Sets',
						value: 'sets',
						description: "Data in key is of type 'sets'",
					},
					{
						name: 'String',
						value: 'string',
						description: "Data in key is of type 'string'",
					},
				],
				default: 'automatic',
				description: 'The type of the key to set',
			},
			{
				displayName: 'Value Is JSON',
				name: 'valueIsJSON',
				type: 'boolean',
				displayOptions: {
					show: {
						keyType: ['hash'],
					},
				},
				default: true,
				description: 'Whether the value is JSON or key value pairs',
			},
			{
				displayName: 'Expire',
				name: 'expire',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['set'],
					},
				},
				default: false,
				description: 'Whether to set a timeout on key',
			},

			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						operation: ['set'],
						expire: [true],
					},
				},
				default: 60,
				description: 'Number of seconds before key expiration',
			},
			// ----------------------------------
			//         publish
			// ----------------------------------
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['publish'],
					},
				},
				default: '',
				required: true,
				description: 'Channel name',
			},
			{
				displayName: 'Data',
				name: 'messageData',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['publish'],
					},
				},
				default: '',
				required: true,
				description: 'Data to publish',
			},
			// ----------------------------------
			//         push/pop
			// ----------------------------------
			{
				displayName: 'List',
				name: 'list',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['push', 'pop'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the list in Redis',
			},
			{
				displayName: 'Data',
				name: 'messageData',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['push'],
					},
				},
				default: '',
				required: true,
				description: 'Data to push',
			},
			{
				displayName: 'Tail',
				name: 'tail',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['push', 'pop'],
					},
				},
				default: false,
				description: 'Whether to push or pop data from the end of the list',
			},
			{
				displayName: 'Name',
				name: 'propertyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['pop'],
					},
				},
				default: 'propertyName',
				description:
					'Optional name of the property to write received data to. Supports dot-notation. Example: "data.person[0].name".',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['pop'],
					},
				},
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>.',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: { redisConnectionTest },
	};

	async execute(this: IExecuteFunctions) {
		// TODO: For array and object fields it should not have a "value" field it should
		//       have a parameter field for a path. Because it is not possible to set
		//       array, object via parameter directly (should maybe be possible?!?!)
		//       Should maybe have a parameter which is JSON.
		const credentials = await this.getCredentials<RedisCredential>('redis');

		const client = setupRedisClient(credentials);
		await client.connect();
		await client.ping();

		const operation = this.getNodeParameter('operation', 0);
		const returnItems: INodeExecutionData[] = [];

		if (operation === 'info') {
			try {
				const result = await client.info();
				returnItems.push({ json: convertInfoToObject(result) });
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: {
							error: error.message,
						},
					});
				} else {
					await client.quit();
					throw new NodeOperationError(this.getNode(), error);
				}
			}
		} else if (
			['delete', 'get', 'keys', 'set', 'incr', 'publish', 'push', 'pop'].includes(operation)
		) {
			const items = this.getInputData();

			let item: INodeExecutionData;
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					item = { json: {}, pairedItem: { item: itemIndex } };

					if (operation === 'delete') {
						const keyDelete = this.getNodeParameter('key', itemIndex) as string;

						await client.del(keyDelete);
						returnItems.push(items[itemIndex]);
					} else if (operation === 'get') {
						const propertyName = this.getNodeParameter('propertyName', itemIndex) as string;
						const keyGet = this.getNodeParameter('key', itemIndex) as string;
						const keyType = this.getNodeParameter('keyType', itemIndex) as string;

						const value = (await getValue(client, keyGet, keyType)) ?? null;

						const options = this.getNodeParameter('options', itemIndex, {});

						if (options.dotNotation === false) {
							item.json[propertyName] = value;
						} else {
							set(item.json, propertyName, value);
						}

						returnItems.push(item);
					} else if (operation === 'keys') {
						const keyPattern = this.getNodeParameter('keyPattern', itemIndex) as string;
						const getValues = this.getNodeParameter('getValues', itemIndex, true) as boolean;

						const keys = await client.keys(keyPattern);

						if (!getValues) {
							returnItems.push({ json: { keys } });
							continue;
						}

						for (const keyName of keys) {
							item.json[keyName] = await getValue(client, keyName);
						}
						returnItems.push(item);
					} else if (operation === 'set') {
						const keySet = this.getNodeParameter('key', itemIndex) as string;
						const value = this.getNodeParameter('value', itemIndex) as string;
						const keyType = this.getNodeParameter('keyType', itemIndex) as string;
						const valueIsJSON = this.getNodeParameter('valueIsJSON', itemIndex, true) as boolean;
						const expire = this.getNodeParameter('expire', itemIndex, false) as boolean;
						const ttl = this.getNodeParameter('ttl', itemIndex, -1) as number;

						await setValue.call(this, client, keySet, value, expire, ttl, keyType, valueIsJSON);
						returnItems.push(items[itemIndex]);
					} else if (operation === 'incr') {
						const keyIncr = this.getNodeParameter('key', itemIndex) as string;
						const expire = this.getNodeParameter('expire', itemIndex, false) as boolean;
						const ttl = this.getNodeParameter('ttl', itemIndex, -1) as number;
						const incrementVal = await client.incr(keyIncr);
						if (expire && ttl > 0) {
							await client.expire(keyIncr, ttl);
						}
						returnItems.push({ json: { [keyIncr]: incrementVal } });
					} else if (operation === 'publish') {
						const channel = this.getNodeParameter('channel', itemIndex) as string;
						const messageData = this.getNodeParameter('messageData', itemIndex) as string;
						await client.publish(channel, messageData);
						returnItems.push(items[itemIndex]);
					} else if (operation === 'push') {
						const redisList = this.getNodeParameter('list', itemIndex) as string;
						const messageData = this.getNodeParameter('messageData', itemIndex) as string;
						const tail = this.getNodeParameter('tail', itemIndex, false) as boolean;
						await client[tail ? 'rPush' : 'lPush'](redisList, messageData);
						returnItems.push(items[itemIndex]);
					} else if (operation === 'pop') {
						const redisList = this.getNodeParameter('list', itemIndex) as string;
						const tail = this.getNodeParameter('tail', itemIndex, false) as boolean;
						const propertyName = this.getNodeParameter(
							'propertyName',
							itemIndex,
							'propertyName',
						) as string;

						const value = await client[tail ? 'rPop' : 'lPop'](redisList);

						let outputValue;
						try {
							outputValue = value && JSON.parse(value);
						} catch {
							outputValue = value;
						}
						const options = this.getNodeParameter('options', itemIndex, {});
						if (options.dotNotation === false) {
							item.json[propertyName] = outputValue;
						} else {
							set(item.json, propertyName, outputValue);
						}
						returnItems.push(item);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnItems.push({
							json: {
								error: error.message,
							},
							pairedItem: {
								item: itemIndex,
							},
						});
						continue;
					}
					await client.quit();
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
			}
		}
		await client.quit();
		return [returnItems];
	}
}
