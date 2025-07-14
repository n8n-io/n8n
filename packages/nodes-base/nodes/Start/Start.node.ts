import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class Start implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Start',
		name: 'start',
		icon: 'fa:play',
		group: ['input'],
		version: 1,
		description: 'Starts the workflow execution from this node',
		maxNodes: 1,
		hidden: true,
		defaults: {
			name: 'Start',
			color: '#00e000',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];
	}
}
