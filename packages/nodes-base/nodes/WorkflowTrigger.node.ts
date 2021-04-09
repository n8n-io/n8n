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
		icon: 'fa:play-circle',
		group: ['trigger'],
		version: 1,
		description: 'Executes whenever the workflow becomes active.',
		defaults: {
			name: 'Workflow Trigger',
			color: '#00e000',
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
					'- <b>Workflow Saved</b>: Triggers when this workflow is saved<br>',
				options: [
					{
						name: 'Workflow Activated',
						value: 'activate',
						description: 'Triggers when this workflow is activated.',
					},
					{
						name: 'Workflow Saved',
						value: 'update',
						description: 'Triggers when this workflow is saved.',
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
				event = 'Workflow saved';
			}
			this.emit([
				this.helpers.returnJsonArray([
					{ event, workflow_id: this.getWorkflow().id, },
				]),
			]);
		}

		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{ event: 'Manual execution', workflow_id: self.getWorkflow().id }])]);
		}

		return {
			manualTriggerFunction,
		};
	}
}
