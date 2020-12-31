import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class N8nStartTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Start Trigger',
		name: 'n8nStartTrigger',
		icon: 'fa:play-circle',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when n8n starts',
		defaults: {
			name: 'n8n Start Trigger',
			color: '#00e000',
		},
		inputs: [],
		outputs: ['main'],
		properties: []
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{activation: self.getActivationMode()}])]);
		}
		
		manualTriggerFunction();

		return {
			manualTriggerFunction
		};
	}
}