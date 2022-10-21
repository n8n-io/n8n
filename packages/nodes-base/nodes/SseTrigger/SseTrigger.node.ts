import EventSource from 'eventsource';
import { ITriggerFunctions } from 'n8n-core';
import { INodeType, INodeTypeDescription, ITriggerResponse, jsonParse } from 'n8n-workflow';

export class SseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSE Trigger',
		name: 'sseTrigger',
		icon: 'fa:cloud-download-alt',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when Server-Sent Events occur',
		eventTriggerDescription: '',
		activationMessage: 'You can now make calls to your SSE URL to trigger executions.',
		defaults: {
			name: 'SSE Trigger',
			color: '#225577',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://example.com',
				description: 'The URL to receive the SSE from',
				required: true,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const url = this.getNodeParameter('url') as string;

		const eventSource = new EventSource(url);

		eventSource.onmessage = (event) => {
			// tslint:disable-next-line:no-any
			const eventData = jsonParse<any>(event.data, { errorMessage: 'Invalid JSON for event data' });
			this.emit([this.helpers.returnJsonArray([eventData])]);
		};

		async function closeFunction() {
			eventSource.close();
		}

		return {
			closeFunction,
		};
	}
}
