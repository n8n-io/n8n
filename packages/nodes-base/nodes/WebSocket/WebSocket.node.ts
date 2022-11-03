import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { WebSocket as WebSocketClient } from 'ws';
import { ClientBinaryType } from './interface';

export class WebSocket implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WebSocket',
		name: 'webSocket',
		icon: 'file:websocket.svg',
		group: ['input'],
		version: 1,
		description: 'Send messages to a WebSocket server',
		defaults: {
			name: 'WebSocket',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Use Input Data',
				name: 'useInputData',
				type: 'boolean',
				default: true,
				required: true,
				description: 'Whether to use the input data or the message property',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						useInputData: [false],
					},
				},
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		const address = this.getNodeParameter('address', 0) as string;
		const options = this.getNodeParameter('options', 0) as IDataObject;
		const useInputData = this.getNodeParameter('useInputData', 0) as boolean;

		const client = new WebSocketClient(address);

		if (options.binaryType) {
			client.binaryType = options.binaryType as ClientBinaryType;
		}

		const self = this;

		async function manualTriggerFunction() {
			return await new Promise((resolve, reject) => {
				client.on('open', () => {
					if (useInputData) {
						for (let i = 0; i < items.length; i++) {
							const item = items[i].json;
							client.send(JSON.stringify(item), (error) => {
								if (error) {
									if (self.continueOnFail()) {
										returnData.push({ json: { error: error.message } });
									} else {
										throw error;
									}
								}
							});
							returnData.push({ json: items[i].json });
						}
						resolve(true);
					} else {
						const message = self.getNodeParameter('message', 0) as string;
						client.send(message, (error) => {
							if (error) {
								if (self.continueOnFail()) {
									returnData.push({ json: { error: error.message } });
								} else {
									throw error;
								}
							}
						});
						returnData.push({ json: { message } });
						resolve(true);
					}
				});

				// client.on('message', (data, isBinary) => {
				// 	const message = isBinary ? data : data.toString(encoding as BufferEncoding);
				// 	console.log('message', message);
				// 	if (useInputData) {
				// 		if (message === JSON.stringify(items[items.length - 1].json)) {
				// 			resolve(true);
				// 		}
				// 	} else {
				// 		if (message === self.getNodeParameter('message', 0)) {
				// 			resolve(true);
				// 		}
				// 	}
				// });

				client.on('error', (error) => {
					if (self.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
					} else {
						reject(error);
					}
				});
			});
		}

		await manualTriggerFunction();

		while (client.bufferedAmount > 0) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		client.terminate();

		return this.prepareOutputData(returnData);
	}
}
