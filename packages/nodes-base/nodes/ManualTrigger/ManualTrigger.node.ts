import { IExecuteFunctions } from 'n8n-core';
import { INodeType, INodeTypeDescription, INodeExecutionData } from 'n8n-workflow';

export class ManualTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger', 'output'],
		version: 1,
		description: 'Starts the workflow execution on clicking a button in n8n',
		maxNodes: 1,
		defaults: {
			name: 'Manual Trigger',
			color: '#00e000',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node is where a manual workflow execution starts. To make one, go back to the canvas and click ‘execute workflow’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
