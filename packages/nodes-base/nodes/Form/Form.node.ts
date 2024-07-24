import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	updateDisplayOptions,
} from 'n8n-workflow';

import { formDescription, formFields, formTitle } from './common.descriptions';

export const pageProperties = updateDisplayOptions(
	{
		show: {
			operation: ['page'],
		},
	},
	[
		formFields,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{ ...formTitle, required: false },
				formDescription,
				{
					displayName: 'Form Button Text',
					name: 'buttonText',
					type: 'string',
					default: '',
					placeholder: 'e.g. Submit form',
					description: 'Text to display on the button below the form',
				},
			],
		},
	],
);

export const completionScreenProperties = updateDisplayOptions(
	{
		show: {
			operation: ['completionScreen'],
		},
	},
	[
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			placeholder: 'e.g. Form Sunmitted',
			description: 'Title of the completion screen',
		},
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			default: '',
			placeholder: 'e.g. Your responce have been recorded',
			description: 'Message to display at the completion screen',
			typeOptions: {
				rows: 2,
			},
		},
	],
);

export class Form implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Form Page',
		name: 'form',
		icon: 'file:form.svg',
		group: ['input'],
		version: 1,
		subtitle: '=type: {{ $parameter["operation"] }}',
		description: 'Create a multi-step webform by adding pages to a n8n form',
		defaults: {
			name: 'Form Page',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'n8n Form Trigger node must be set before this node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Form Page',
						value: 'page',
						action: 'Create form step',
					},
					{
						name: 'Form Completion Screen',
						value: 'completionScreen',
						action: 'Create final page to the user with a title and a message',
					},
				],
				default: 'page',
			},
			...pageProperties,
			...completionScreenProperties,
		],
	};

	async execute(this: IExecuteFunctions) {
		const connectedNodes = this.getParentNodes(this.getNode().name);
		if (!connectedNodes.some(({ type }) => type === 'n8n-nodes-base.formTrigger')) {
			throw new NodeOperationError(
				this.getNode(),
				'No n8n Form Trigger node found in the workflow',
				{
					description: 'Insert a n8n Form Trigger node to your workflow befor Form Page node',
				},
			);
		}

		// TODO: get res form trigger stored in somewhere and send it here to update the form
		// wait for response and send it back, process data and return
		const items = this.getInputData();
		for (const item of items) {
			if (item.json.res) {
				(item.json.res as any).json({
					triggeredBy: this.getNode().name,
				});
			}
		}

		const returnData: INodeExecutionData[] = [];

		return [returnData];
	}
}
