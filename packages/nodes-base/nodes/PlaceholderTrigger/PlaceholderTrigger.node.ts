import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class PlaceholderTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Placeholder Trigger',
		name: 'placeholderTrigger',
		icon: 'fa:plus',
		group: ['trigger'],
		version: 1,
		maxNodes: 1,
		hidden: true,
		description: 'Serves as a placeholder if workflow has no triggers',
		defaults: {
			name: 'Choose a Trigger...',
			color: '#7D838F',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [],
		properties: []
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return this.prepareOutputData(items);
	}
}
