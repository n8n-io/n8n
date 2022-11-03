import { ITriggerFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	jsonParse,
} from 'n8n-workflow';

import { WebSocket } from 'ws';
import { ClientBinaryType } from './interface';

export class WebSocketTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WebSocket Trigger',
		name: 'webSocketTrigger',
		icon: 'file:websocket.svg',
		group: ['trigger'],
		version: 1,
		description: 'Subscribe to redis channel',
		defaults: {
			name: 'WebSocket Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Output Field',
				name: 'outputField',
				type: 'string',
				default: 'message',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Binary Type',
						name: 'binaryType',
						type: 'options',
						default: 'nodebuffer',
						options: [
							{
								name: 'Node Buffer',
								value: 'nodebuffer',
							},
							{
								name: 'Array Buffer',
								value: 'arraybuffer',
							},
							{
								name: 'Fragments',
								value: 'fragments',
							},
						],
					},
					{
						displayName: 'Message Encoding',
						name: 'encoding',
						type: 'string',
						default: 'utf8',
					},
					{
						displayName: 'Parse JSON',
						name: 'toJson',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const address = this.getNodeParameter('address', 0) as string;
		const outputField = this.getNodeParameter('outputField', 0) as string;
		const options = this.getNodeParameter('options', 0) as IDataObject;
		const encoding = options?.encoding ? (options.encoding as string) : 'utf8';

		const self = this;
		const client = new WebSocket(address);

		if (options.binaryType) {
			client.binaryType = options.binaryType as ClientBinaryType;
		}

		async function manualTriggerFunction() {
			await new Promise((resolve, reject) => {
				client.on('open', () => {
					console.log('connection open');
				});

				client.on('message', (data, isBinary) => {
					let message = isBinary ? data : data.toString(encoding as BufferEncoding);
					if (options.toJson) {
						message = jsonParse(message as string);
					}

					self.emit([self.helpers.returnJsonArray({ [outputField]: message })]);
					resolve(true);
				});

				client.on('error', (error) => {
					reject(error);
				});
			});
		}

		if (this.getMode() === 'trigger') {
			await manualTriggerFunction();
		}

		async function closeFunction() {
			client.terminate();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
