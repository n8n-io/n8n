import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeExecutionWithMetadata,
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
	
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
		// const resource = this.getNodeParameter('action', 0);
		// const taskDescription = this.getNodeParameter('taskDescription', 0)
		// const nodeStaticData = this.getWorkflowStaticData('node');

		// switch (resource) {
		// 	case 'createTask':
		// 		return honeyBookApiRequest.call(this, 'POST', '/n8n/tasks', { description: taskDescription }, {}, '', {});
		// 	default:
		// 		throw new Error(`The resource "${resource}" is not known!`);
		// }

		debugger;

		return null;
	
	}

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
