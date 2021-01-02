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
		properties: [
			{
				displayName: 'Trigger On Init',
				name: 'init',
				type: 'boolean',
				default: true,
				description: 'Gets triggered when the workflow gets activated on n8n server start.',
			},
			{
				displayName: 'Trigger On Create',
				name: 'create',
				type: 'boolean',
				default: false,
				description: 'Gets triggered when the workflow created active.',
			},
			{
				displayName: 'Trigger On Update',
				name: 'update',
				type: 'boolean',
				default: false,
				description: 'Gets triggered when the workflow gets updated and keeps activated.',
			},
			{
				displayName: 'Trigger On Activate',
				name: 'activate',
				type: 'boolean',
				default: false,
				description: 'Gets triggered when the workflow gets activated.',
			}
		]
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const init		 = this.getNodeParameter('init') as boolean;
		const create	 = this.getNodeParameter('create') as boolean;
		const update	 = this.getNodeParameter('update') as boolean;
		const activate = this.getNodeParameter('activate') as boolean;

		switch(this.getActivationMode()) {
			case 'init':
				if(init) this.emit([this.helpers.returnJsonArray([{activation: 'init'}])]);
				break;
			case 'create':
				if(create) this.emit([this.helpers.returnJsonArray([{activation: 'create'}])]);
				break;
			case 'update':
				if(update) this.emit([this.helpers.returnJsonArray([{activation: 'update'}])]);
				break;
			case 'activate':
				if(activate) this.emit([this.helpers.returnJsonArray([{activation: 'activate'}])]);
				break;
		}
		
		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{activation: 'manual'}])]);
		}

		return {
			manualTriggerFunction
		};
	}
}