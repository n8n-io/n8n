import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import redis from 'redis';

import util from 'util';

export class RedisRateLimit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Redis Rate Limit',
		name: 'redisRateLimit',
		icon: 'file:redis.svg',
		group: ['input'],
		version: 1,
		description: 'Rate limiter using Redis',
		defaults: {
			name: 'Redis Rate Limit',
		},
		inputs: ['main'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
		credentials: [
			{
				name: 'redis',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				required: true,
				description: 'Key to be used from Redis',
			},
			{
				displayName: 'Number Of Requests',
				name: 'count',
				type: 'number',
				default: 5,
				required: true,
				description: 'Number of concurrent requests in a time slot',
			},
			{
				displayName: 'Rata Limit Duration',
				name: 'duration',
				type: 'number',
				default: 30,
				required: true,
				description: 'Rate limit duration in seconds',
			},
		],
	};


	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return new Promise(async (resolve, reject) => {
			const credentials = await this.getCredentials('redis');

			const redisOptions: redis.ClientOpts = {
				host: credentials.host as string,
				port: credentials.port as number,
				db: credentials.database as number,
			};

			if (credentials.password) {
				redisOptions.password = credentials.password as string;
			}

			const client = redis.createClient(redisOptions);

			client.on('error', (err: Error) => {
				client.quit();
				reject(err);
			});

			client.on('ready', async (err: Error | null) => {
				client.select(credentials.database as number);
				try {
					const items = this.getInputData();
					const returnItems: INodeExecutionData[] = [];
					const returnRateLimitedItems: INodeExecutionData[] = [];

					let item: INodeExecutionData;
					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						item = { json: {} };

						const keyName = this.getNodeParameter('key', itemIndex) as string;
						const count = this.getNodeParameter('count', itemIndex, -1) as number;
						const duration = this.getNodeParameter('duration', itemIndex, -1) as number;

						// Based on https://redis.io/commands/incr/
						const clientLlen = util.promisify(client.llen).bind(client);
						const current = await clientLlen(keyName);

						if (current >= count) {
							// Deny
							returnRateLimitedItems.push(items[itemIndex]);
						} else {
							const clientExists = util.promisify(client.exists).bind(client);
							//@ts-ignore
							const exists = await clientExists(keyName);
							if (exists == 0) {
								const multi = client.multi([
									['RPUSH', keyName, keyName],
									['EXPIRE', keyName, duration],
								])
								let clientMulti = util.promisify(multi.exec).bind(multi);
								await clientMulti();
							} else {
								const clientRpushx = util.promisify(client.rpushx).bind(client);
								await clientRpushx(keyName, keyName);
							}

							// Allow
							returnItems.push(items[itemIndex]);
						}

						client.quit();
						resolve([returnItems, returnRateLimitedItems]);
					}
				} catch (error) {
					reject(error);
				}
			});
		});
	}
}
