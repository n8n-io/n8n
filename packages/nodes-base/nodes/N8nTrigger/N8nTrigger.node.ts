import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

type eventType = 'Instance started' | undefined;

export class N8nTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Trigger',
		name: 'n8nTrigger',
		icon: 'file:n8nTrigger.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle events and perform actions on your n8n instance',
		eventTriggerDescription: '',
		mockManualExecution: true,
		defaults: {
			name: 'n8n Trigger',
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
				description:
					'Specifies under which conditions an execution should happen: <b>Instance started</b>: Triggers when this n8n instance is started or re-started',
				options: [
					{
						name: 'Instance Started',
						value: 'init',
						description: 'Triggers when this n8n instance is started or re-started',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const events = this.getNodeParameter('events', []) as string[];

		const activationMode = this.getActivationMode();

		if (events.includes(activationMode)) {
			let event: eventType;
			if (activationMode === 'init') {
				event = 'Instance started';
			}
			this.emit([
				this.helpers.returnJsonArray([
					{ event, timestamp: new Date().toISOString(), workflow_id: this.getWorkflow().id },
				]),
			]);
		}

		const manualTriggerFunction = async () => {
			this.emit([
				this.helpers.returnJsonArray([
					{
						event: 'Manual execution',
						timestamp: new Date().toISOString(),
						workflow_id: this.getWorkflow().id,
					},
				]),
			]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
