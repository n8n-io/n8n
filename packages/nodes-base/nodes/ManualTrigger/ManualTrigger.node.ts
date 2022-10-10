import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	ITriggerResponse,
	toCronExpression,
	TriggerTime,
} from 'n8n-workflow';

export class ManualTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger', 'input'],
		version: 1,
		description: 'Starts the workflow execution on clicking a buton in N8N',
		maxNodes: 1,
		defaults: {
			name: 'Manual Trigger',
			color: '#ff6d5a',
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
