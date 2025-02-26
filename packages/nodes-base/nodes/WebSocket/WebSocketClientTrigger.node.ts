import type {
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionType } from 'n8n-workflow';
import { type RawData, WebSocket } from 'ws';

type Options = {
	jsonParseBody: boolean;
};

export class WebSocketClientTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WebSocket Client Trigger',
		name: 'webSocketClientTrigger',
		description: 'Starts the workflow when a webhook message is recieved',
		icon: {
			light: 'file:websocket-client.svg',
			dark: 'file:websocket-client-dark.svg',
		},
		iconColor: 'black',
		group: ['trigger'],
		version: 1,
		defaults: {
			name: 'WebSocket Client Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
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
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to try to parse the message to an object',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const url = this.getNodeParameter('url', 0) as string;
		const options = this.getNodeParameter('options') as Options;

		const processMessage = (data: RawData) => {
			const messageStr = data.toString('utf-8');
			return options.jsonParseBody ? jsonParse<IDataObject>(messageStr) : messageStr;
		};

		const ws = new WebSocket(url);
		const manualTriggerFunction = async () =>
			await new Promise<void>(async (resolve) => {
				ws.once('message', (data: RawData) => {
					const message = processMessage(data);
					this.emit([this.helpers.returnJsonArray({ message })]);
					resolve();
				});
			});

		if (this.getMode() === 'trigger') {
			ws.on('message', (data: RawData) => {
				const message = processMessage(data);
				this.emit([this.helpers.returnJsonArray({ message })]);
			});
		}

		const closeFunction = async () => {
			ws.close();
		};

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
