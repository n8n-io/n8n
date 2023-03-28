import type { ILoadOptionsFunctions } from 'n8n-core';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
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
				displayName: 'Form',
				name: 'formId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select a form...',
				modes: [
					{
						displayName: 'Form',
						name: 'form',
						type: 'list',
						placeholder: 'Select a form...',
						typeOptions: {
							resource: 'form',
							searchable: true,
						},
					},
				],
				required: true,
				description: 'The form to listen to',
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
