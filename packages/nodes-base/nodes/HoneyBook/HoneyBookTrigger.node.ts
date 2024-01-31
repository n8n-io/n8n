import type {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { honeyBookApiRequest } from './GenericFunctions';

export class HoneyBookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HoneyBook Trigger',
		name: 'honeyBookTrigger',
		icon: 'file:honeyBook.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when HoneyBook events occur',
		defaults: {
			name: 'HoneyBook',
		},
		// credentials: [
		// 	{
		// 		name: 'honeyBookApi',
		// 		required: true,
		// 	},
		// ],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [

		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		console.log('=== HB TRIGGER NODE ===');
		console.log(webhookData);

		const response = await honeyBookApiRequest.call(this, 'GET', '/n8n/events', {}, {}, '', {});

		if (response.events.length > 0) {
			return [this.helpers.returnJsonArray(response.events)];
		}

		return null;
	}
}
