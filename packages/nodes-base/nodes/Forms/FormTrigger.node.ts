import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class FormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Form Trigger',
		name: 'formTrigger',
		icon: 'file:form.svg',
		group: ['trigger'],
		version: 1,
		description: 'Tiggers workflow when form is submitted.',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'On form submission',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					"When an ‘execute workflow’ node calls this workflow, the execution starts here. Any data passed into the 'execute workflow' node will be output by this node.",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'On Form Submission',
						value: 'form_submission',
						description: 'When form is submitted',
						action: 'When form is submitted',
					},
				],
				default: 'form_submission',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
