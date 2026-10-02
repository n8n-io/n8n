import {
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class MicrosoftSharePointTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SharePoint Trigger',
		name: 'microsoftSharePointTrigger',
		icon: {
			light: 'file:microsoftSharePoint.svg',
			dark: 'file:microsoftSharePoint.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when a file or list item changes in Microsoft SharePoint',
		subtitle: '',
		defaults: {
			name: 'Microsoft SharePoint Trigger',
		},
		// Stays out of the node picker until the whole trigger is built. Note this
		// also labels the node "Deprecated" in the NDV until it is removed.
		hidden: true,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return null;
	}
}
