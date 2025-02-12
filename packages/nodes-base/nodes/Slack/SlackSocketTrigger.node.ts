import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { type RawData, WebSocket } from 'ws';

export class SlackSocketTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Slack Socket Trigger',
		name: 'slackSocketTrigger',
		description: 'Starts the workflow when a webhook message is recieved',
		icon: 'file:slack.svg',
		group: ['trigger'],
		version: 1,
		defaults: {
			name: 'Slack Socket Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'slackApi',
				required: true,
			},
		],
		properties: [],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const { accessToken } = await this.getCredentials<{ accessToken: string }>('slackApi');

		// Register a new websocket url
		const registration = (await this.helpers.httpRequest({
			method: 'POST',
			url: 'https://slack.com/api/apps.connections.open',
			headers: {
				'Content-type': 'application/x-www-form-urlencoded',
				Authorization: `Bearer ${accessToken}`,
			},
		})) as { ok: false } | { ok: true; url: string };

		if (!registration.ok) {
			throw new NodeOperationError(this.getNode(), 'Failed to register websocket');
		}

		const processMessage = (data: RawData) => {
			const messageStr = data.toString('utf-8');
			return jsonParse<IDataObject>(messageStr);
		};

		const ws = new WebSocket(registration.url);
		const manualTriggerFunction = async () =>
			await new Promise<void>(async (resolve) => {
				const onMessage = (data: RawData) => {
					const message = processMessage(data);
					if (message.type === 'hello') return;
					ws.off('message', onMessage);
					this.emit([this.helpers.returnJsonArray({ message })]);
					resolve();
				};
				ws.on('message', onMessage);
			});

		if (this.getMode() === 'trigger') {
			ws.on('message', (data: RawData) => {
				const message = processMessage(data);
				if (message.type === 'hello') return;
				this.emit([this.helpers.returnJsonArray({ message })]);
			});
		}

		const closeFunction = async () => {
			// TODO: deregister websocket url
			ws.close();
		};

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
