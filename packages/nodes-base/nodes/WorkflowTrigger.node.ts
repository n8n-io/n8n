import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class WorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workflow Trigger',
		name: 'workflowTrigger',
		icon: 'fa:network-wired',
		group: ['trigger'],
		version: 1,
		description: 'Triggers based on various lifecycle events, like when a workflow is activated',
		defaults: {
			name: 'Workflow Trigger',
			color: '#ff6d5a',
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
					'- <b>Workflow Activated</b>: Triggers when this workflow is activated<br />' +
					'- <b>Active Workflow Updated</b>: Triggers when this workflow is updated<br>',
				options: [
					{
						name: 'Workflow Activated',
						value: 'activate',
						description: 'Triggers when this workflow is activated',
					},
					{
						name: 'Active Workflow Updated',
						value: 'update',
						description: 'Triggers when this workflow is updated',
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
			if (activationMode === 'activate') {
				event = 'Workflow activated';
			}
			if (activationMode === 'update') {
				event = 'Workflow updated';
			}
			this.emit([
				this.helpers.returnJsonArray([
					{ event, timestamp: (new Date()).toISOString(), workflow_id: this.getWorkflow().id },
				]),
			]);
		}

		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{ event: 'Manual execution', timestamp: (new Date()).toISOString(), workflow_id: self.getWorkflow().id }])]);
		}

		return {
			manualTriggerFunction,
		};
	}
}
