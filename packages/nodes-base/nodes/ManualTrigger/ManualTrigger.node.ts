import { ITriggerFunctions } from 'n8n-core';
import { INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow';

export class ManualTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger', 'input'],
		version: 1,
		description: 'Runs the flow on clicking a button in n8n',
		maxNodes: 1,
		defaults: {
			name: "On clicking 'execute'",
			color: '#909298',
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

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
