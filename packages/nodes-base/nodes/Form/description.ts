import type { INodeProperties } from 'n8n-workflow';

export const formNodeDescription: INodeProperties[] = [
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		default: '',
		placeholder: 'webhook',
		required: true,
		description: 'The path to listen to',
	},
	{
		displayName: 'Form Title',
		name: 'formTitle',
		type: 'string',
		default: '',
		placeholder: 'e.g. Contact us',
		required: true,
		description: 'Shown at the top of the form',
	},
	{
		displayName: 'Form Description',
		name: 'formDescription',
		type: 'string',
		default: '',
		placeholder: "e.g. We'll get back to you soon",
		description:
			'Shown underneath the Form Title. Can be used to prompt the user on how to complete the form.',
	},
	{
		displayName: 'Form Fields',
		name: 'formFields',
		placeholder: 'Add Form Field',
		type: 'fixedCollection',
		default: { values: [{ label: '', fieldType: 'text' }] },
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Field Label',
						name: 'fieldLabel',
						type: 'string',
						default: '',
						placeholder: 'e.g. What is your name?',
						description: 'Label appears above the input field',
						required: true,
					},
					{
						displayName: 'Field Type',
						name: 'fieldType',
						type: 'options',
						default: 'text',
						description: 'The type of field to add to the form',
						options: [
							{
								name: 'Date',
								value: 'date',
							},
							{
								name: 'Dropdown List',
								value: 'dropdown',
							},
							{
								name: 'Number',
								value: 'number',
							},
							{
								name: 'Password',
								value: 'password',
							},
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'Textarea',
								value: 'textarea',
							},
						],
						required: true,
					},
					{
						displayName: 'Field Options',
						name: 'fieldOptions',
						placeholder: 'Add Field Option',
						description: 'List of options that can be selected from the dropdown',
						type: 'fixedCollection',
						default: { values: [{ option: '' }] },
						required: true,
						displayOptions: {
							show: {
								fieldType: ['dropdown'],
							},
						},
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						options: [
							{
								displayName: 'Values',
								name: 'values',
								values: [
									{
										displayName: 'Option',
										name: 'option',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Multiple Choice',
						name: 'multiselect',
						type: 'boolean',
						default: false,
						description:
							'Whether to allow the user to select multiple options from the dropdown list',
						displayOptions: {
							show: {
								fieldType: ['dropdown'],
							},
						},
					},
					{
						displayName: 'Required Field',
						name: 'requiredField',
						type: 'boolean',
						default: false,
						description:
							'Whether to require the user to enter a value for this field before submitting the form',
					},
				],
			},
		],
	},
	{
		displayName: 'Respond When',
		name: 'responseMode',
		type: 'options',
		options: [
			{
				name: 'Form Is Submitted',
				value: 'onReceived',
				description: 'As soon as this node receives the form submission',
			},
			{
				name: 'Workflow Finishes',
				value: 'lastNode',
				description: 'When the last node of the workflow is executed',
			},
		],
		default: 'onReceived',
		description: 'When to respond to the form submission',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Form Submitted Text',
				name: 'formSubmittedText',
				description: 'The text displayed to users after they filled the form',
				type: 'string',
				default: 'Your response has been recorded',
			},
		],
	},
];
