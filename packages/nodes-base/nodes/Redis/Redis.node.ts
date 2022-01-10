import { IExecuteFunctions } from 'n8n-core';
import {
	GenericValue,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { set } from 'lodash';
import * as redis from 'redis';

import * as util from 'util';

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
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'redis',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a key from Redis.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the value of a key from Redis.',
					},
					{
						name: 'Info',
						value: 'info',
						description: 'Returns generic information about the Redis instance.',
					},
					{
						name: 'Increment',
						value: 'incr',
						description: 'Atomically increments a key by 1. Creates the key if it does not exist.',
					},
					{
						name: 'Keys',
						value: 'keys',
						description: 'Returns all the keys matching a pattern.',
					},
					{
						name: 'Set',
						value: 'set',
						description: 'Set the value of a key in redis.',
					},
				],
				default: 'info',
				description: 'The operation to perform.',
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
						operation: [
							'get',
						],
					},
				},
				default: 'propertyName',
				required: true,
				description: 'Name of the property to write received data to. Supports dot-notation. Example: "data.person[0].name"',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to delete from Redis.',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to get from Redis.',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
				options: [
					{
						name: 'Automatic',
						value: 'automatic',
						description: 'Requests the type before requesting the data (slower).',
					},
					{
						name: 'Hash',
						value: 'hash',
						description: 'Data in key is of type "hash".',
					},
					{
						name: 'String',
						value: 'string',
						description: 'Data in key is of type "string".',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Data in key is of type "lists".',
					},
					{
						name: 'Sets',
						value: 'sets',
						description: 'Data in key is of type "sets".',
					},
				],
				default: 'automatic',
				description: 'The type of the key to get.',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						description: `<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>
						`,
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
						operation: [
							'incr',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to increment.',
			},
			{
				displayName: 'Expire',
				name: 'expire',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'incr',
						],
					},
				},
				default: false,
				description: 'Set a timeout on key?',
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
						operation: [
							'incr',
						],
						expire: [
							true,
						],
					},
				},
				default: 60,
				description: 'Number of seconds before key expiration.',
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
						operation: [
							'keys',
						],
					},
				},
				default: '',
				required: true,
				description: 'The key pattern for the keys to return.',
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
						operation: [
							'set',
						],
					},
				},
				default: '',
				required: true,
				description: 'Name of the key to set in Redis.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'set',
						],
					},
				},
				default: '',
				description: 'The value to write in Redis.',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'set',
						],
					},
				},
				options: [
					{
						name: 'Automatic',
						value: 'automatic',
						description: 'Tries to figure out the type automatically depending on the data.',
					},
					{
						name: 'Hash',
						value: 'hash',
						description: 'Data in key is of type "hash".',
					},
					{
						name: 'String',
						value: 'string',
						description: 'Data in key is of type "string".',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Data in key is of type "lists".',
					},
					{
						name: 'Sets',
						value: 'sets',
						description: 'Data in key is of type "sets".',
					},
				],
				default: 'automatic',
				description: 'The type of the key to set.',
			},

			{
				displayName: 'Expire',
				name: 'expire',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'set',
						],
					},
				},
				default: false,
				description: 'Set a timeout on key ?',
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
						operation: [
							'set',
						],
						expire: [
							true,
						],
					},
				},
				default: 60,
				description: 'Number of seconds before key expiration.',
			},
		],
	};


	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Parses the given value in a number if it is one else returns a string
		function getParsedValue(value: string): string | number {
			if (value.match(/^[\d\.]+$/) === null) {
				// Is a string
				return value;
			} else {
				// Is a number
				return parseFloat(value);
			}
		}

		// Converts the Redis Info String into an object
		function convertInfoToObject(stringData: string): IDataObject {
			const returnData: IDataObject = {};

			let key: string, value: string;
			for (const line of stringData.split('\n')) {
				if (['#', ''].includes(line.charAt(0))) {
					continue;
				}
				[key, value] = line.split(':');
				if (key === undefined || value === undefined) {
					continue;
				}
				value = value.trim();

				if (value.includes('=')) {
					returnData[key] = {};
					let key2: string, value2: string;
					for (const keyValuePair of value.split(',')) {
						[key2, value2] = keyValuePair.split('=');
						(returnData[key] as IDataObject)[key2] = getParsedValue(value2);
					}
				} else {
					returnData[key] = getParsedValue(value);
				}
			}

			return returnData;
		}

		async function getValue(client: redis.RedisClient, keyName: string, type?: string) {
			if (type === undefined || type === 'automatic') {
				// Request the type first
				const clientType = util.promisify(client.type).bind(client);
				type = await clientType(keyName);
			}

			if (type === 'string') {
				const clientGet = util.promisify(client.get).bind(client);
				return await clientGet(keyName);
			} else if (type === 'hash') {
				const clientHGetAll = util.promisify(client.hgetall).bind(client);
				return await clientHGetAll(keyName);
			} else if (type === 'list') {
				const clientLRange = util.promisify(client.lrange).bind(client);
				return await clientLRange(keyName, 0, -1);
			} else if (type === 'sets') {
				const clientSMembers = util.promisify(client.smembers).bind(client);
				return await clientSMembers(keyName);
			}
		}


		const setValue = async (client: redis.RedisClient, keyName: string, value: string | number | object | string[] | number[], expire: boolean, ttl: number, type?: string) => {
			if (type === undefined || type === 'automatic') {
				// Request the type first
				if (typeof value === 'string') {
					type = 'string';
				} else if (Array.isArray(value)) {
					type = 'list';
				} else if (typeof value === 'object') {
					type = 'hash';
				} else {
					throw new NodeOperationError(this.getNode(), 'Could not identify the type to set. Please set it manually!');
				}
			}

			if (type === 'string') {
				const clientSet = util.promisify(client.set).bind(client);
				await clientSet(keyName, value.toString());
			} else if (type === 'hash') {
				const clientHset = util.promisify(client.hset).bind(client);
				for (const key of Object.keys(value)) {
					// @ts-ignore
					await clientHset(keyName, key, (value as IDataObject)[key]!.toString());
				}
			} else if (type === 'list') {
				const clientLset = util.promisify(client.lset).bind(client);
				for (let index = 0; index < (value as string[]).length; index++) {
					await clientLset(keyName, index, (value as IDataObject)[index]!.toString());
				}
			}

			if (expire === true) {
				const clientExpire = util.promisify(client.expire).bind(client);
				await clientExpire(keyName, ttl);
			}
			return;
		};


		return new Promise(async (resolve, reject) => {
			// TODO: For array and object fields it should not have a "value" field it should
			//       have a parameter field for a path. Because it is not possible to set
			//       array, object via parameter directly (should maybe be possible?!?!)
			//       Should maybe have a parameter which is JSON.
			const credentials = await this.getCredentials('redis');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const redisOptions: redis.ClientOpts = {
				host: credentials.host as string,
				port: credentials.port as number,
			};

			if (credentials.password) {
				redisOptions.password = credentials.password as string;
			}

			const client = redis.createClient(redisOptions);

			const operation = this.getNodeParameter('operation', 0) as string;

			client.on('error', (err: Error) => {
				client.quit();
				reject(err);
			});

			client.on('ready', async (err: Error | null) => {
				client.select(credentials.database as number);
				try {
					if (operation === 'info') {
						const clientInfo = util.promisify(client.info).bind(client);
						const result = await clientInfo();

						resolve(this.prepareOutputData([{ json: convertInfoToObject(result as unknown as string) }]));
						client.quit();

					} else if (['delete', 'get', 'keys', 'set', 'incr'].includes(operation)) {
						const items = this.getInputData();
						const returnItems: INodeExecutionData[] = [];

						let item: INodeExecutionData;
						for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
							item = { json: {} };

							if (operation === 'delete') {
								const keyDelete = this.getNodeParameter('key', itemIndex) as string;

								const clientDel = util.promisify(client.del).bind(client);
								// @ts-ignore
								await clientDel(keyDelete);
								returnItems.push(items[itemIndex]);
							} else if (operation === 'get') {
								const propertyName = this.getNodeParameter('propertyName', itemIndex) as string;
								const keyGet = this.getNodeParameter('key', itemIndex) as string;
								const keyType = this.getNodeParameter('keyType', itemIndex) as string;

								const value = await getValue(client, keyGet, keyType) || null;

								const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

								if (options.dotNotation === false) {
									item.json[propertyName] = value;
								} else {
									set(item.json, propertyName, value);
								}

								returnItems.push(item);
							} else if (operation === 'keys') {
								const keyPattern = this.getNodeParameter('keyPattern', itemIndex) as string;

								const clientKeys = util.promisify(client.keys).bind(client);
								const keys = await clientKeys(keyPattern);

								const promises: {
									[key: string]: GenericValue;
								} = {};

								for (const keyName of keys) {
									promises[keyName] = await getValue(client, keyName);
								}

								for (const keyName of keys) {
									item.json[keyName] = await promises[keyName];
								}
								returnItems.push(item);
							} else if (operation === 'set') {
								const keySet = this.getNodeParameter('key', itemIndex) as string;
								const value = this.getNodeParameter('value', itemIndex) as string;
								const keyType = this.getNodeParameter('keyType', itemIndex) as string;
								const expire = this.getNodeParameter('expire', itemIndex, false) as boolean;
								const ttl = this.getNodeParameter('ttl', itemIndex, -1) as number;

								await setValue(client, keySet, value, expire, ttl, keyType);
								returnItems.push(items[itemIndex]);
							} else if (operation === 'incr') {

								const keyIncr = this.getNodeParameter('key', itemIndex) as string;
								const expire = this.getNodeParameter('expire', itemIndex, false) as boolean;
								const ttl = this.getNodeParameter('ttl', itemIndex, -1) as number;
								const clientIncr = util.promisify(client.incr).bind(client);
								// @ts-ignore
								const incrementVal = await clientIncr(keyIncr);
								if (expire === true && ttl > 0) {
									const clientExpire = util.promisify(client.expire).bind(client);
									await clientExpire(keyIncr, ttl);
								}
								returnItems.push({json: {[keyIncr]: incrementVal}});
							}
						}

						client.quit();
						resolve(this.prepareOutputData(returnItems));
					}
				} catch (error) {
					reject(error);
				}
			});
		});
	}
}
