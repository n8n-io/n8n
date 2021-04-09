import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class N8nTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Trigger',
		name: 'n8nTrigger',
		icon: 'fa:dot-circle',
		group: ['trigger'],
		version: 1,
		description: 'Executes whenever the n8n instance is started or re-started.',
		defaults: {
			name: 'N8n Trigger',
			color: '#FF6D5A',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Specifies under which conditions an execution should happen:<br />' +
					'- <b>Instance started</b>: Triggers when this n8n instance is started or re-started',
				options: [
					{
						name: 'Instance started',
						value: 'init',
						description: 'Triggers when this n8n instance is started or re-started.',
					},
				],
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const events = this.getNodeParameter('events', []) as string[];

		const activationMode = this.getActivationMode();

		if (events.includes(activationMode)) {
			let event;
			if (activationMode === 'init') {
				event = 'Instance started';
			}
			this.emit([
				this.helpers.returnJsonArray([
					{ event, timestamp: new Date().toISOString(), },
				]),
			]);
		}

		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{ event: 'Manual execution', timestamp: (new Date()).toISOString() }])]);
		}

		return {
			manualTriggerFunction,
		};
	}
}
