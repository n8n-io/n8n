import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class ManualTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow on clicking a button in n8n',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'When clicking "Test workflow"',
			color: '#909298',
		},

		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node is where a manual workflow execution starts. To make one, go back to the canvas and click test workflow’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
