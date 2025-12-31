import type { INodeProperties } from 'n8n-workflow';

import { appendAttributionOption } from '../../utils/descriptions';

export const placeholder: string = `
<!-- Your custom HTML here --->


`.trimStart();

export const webhookPath: INodeProperties = {
	displayName: 'Form Path',
	name: 'path',
	type: 'string',
	default: '',
	placeholder: 'webhook',
	required: true,
	description: "The final segment of the form's URL, both for test and production",
};

export const formTitle: INodeProperties = {
	displayName: 'Form Title',
	name: 'formTitle',
	type: 'string',
	default: '',
	placeholder: 'e.g. Contact us',
	required: true,
	description: 'Shown at the top of the form',
};

export const formDescription: INodeProperties = {
	displayName: 'Form Description',
	name: 'formDescription',
	type: 'string',
	default: '',
	placeholder: "e.g. We'll get back to you soon",
	description:
		'Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.',
	typeOptions: {
		rows: 2,
	},
};

export const formFields: INodeProperties = {
	displayName: 'Form Elements',
	name: 'formFields',
	placeholder: 'Add Form Element',
	type: 'fixedCollection',
	default: {},
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
					displayName: 'Field Name',
					name: 'fieldLabel',
					type: 'string',
					default: '',
					placeholder: 'e.g. What is your name?',
					description: 'Label that appears above the input field',
					required: true,
					displayOptions: {
						hide: {
							fieldType: ['hiddenField', 'html'],
						},
					},
				},
				{
					displayName: 'Field Name',
					name: 'fieldName',
					description:
						'The name of the field, used in input attributes and referenced by the workflow',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['hiddenField'],
						},
					},
				},
				{
					displayName: 'Element Type',
					name: 'fieldType',
					type: 'options',
					default: 'text',
					description: 'The type of field to add to the form',
					options: [
						{
							name: 'Checkboxes',
							value: 'checkbox',
						},
						{
							name: 'Custom HTML',
							value: 'html',
						},
						{
							name: 'Date',
							value: 'date',
						},
						{
							name: 'Dropdown',
							value: 'dropdown',
						},
						{
							name: 'Email',
							value: 'email',
						},
						{
							name: 'File',
							value: 'file',
						},
						{
							name: 'Hidden Field',
							value: 'hiddenField',
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
							name: 'Radio Buttons',
							value: 'radio',
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
					displayName: 'Element Name',
					name: 'elementName',
					type: 'string',
					default: '',
					placeholder: 'e.g. content-section',
					description: 'Optional field. It can be used to include the html in the output.',
					displayOptions: {
						show: {
							fieldType: ['html'],
						},
					},
				},
				{
					displayName: 'Placeholder',
					name: 'placeholder',
					description: 'Sample text to display inside the field',
					type: 'string',
					default: '',
					displayOptions: {
						hide: {
							fieldType: ['dropdown', 'date', 'file', 'html', 'hiddenField', 'radio', 'checkbox'],
						},
					},
				},
				{
					displayName: 'Field Value',
					name: 'fieldValue',
					description:
						'Input value can be set here or will be passed as a query parameter via Field Name if no value is set',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['hiddenField'],
						},
					},
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
					displayName: 'Checkboxes',
					name: 'fieldOptions',
					placeholder: 'Add Checkbox',
					type: 'fixedCollection',
					default: { values: [{ option: '' }] },
					required: true,
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
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
									displayName: 'Checkbox Label',
									name: 'option',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: 'Radio Buttons',
					name: 'fieldOptions',
					placeholder: 'Add Radio Button',
					type: 'fixedCollection',
					default: { values: [{ option: '' }] },
					required: true,
					displayOptions: {
						show: {
							fieldType: ['radio'],
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
									displayName: 'Radio Button Label',
									name: 'option',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName:
						'Multiple Choice is a legacy option, please use Checkboxes or Radio Buttons field type instead',
					name: 'multiselectLegacyNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							multiselect: [true],
							fieldType: ['dropdown'],
							'@version': [{ _cnd: { lt: 2.3 } }],
						},
					},
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
							'@version': [{ _cnd: { lt: 2.3 } }],
						},
					},
				},
				{
					displayName: 'Limit Selection',
					name: 'limitSelection',
					type: 'options',
					default: 'unlimited',
					options: [
						{
							name: 'Exact Number',
							value: 'exact',
						},
						{
							name: 'Range',
							value: 'range',
						},
						{
							name: 'Unlimited',
							value: 'unlimited',
						},
					],
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
						},
					},
				},
				{
					displayName: 'Number of Selections',
					name: 'numberOfSelections',
					type: 'number',
					default: 1,
					typeOptions: {
						numberPrecision: 0,
						minValue: 1,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['exact'],
						},
					},
				},
				{
					displayName: 'Minimum Selections',
					name: 'minSelections',
					type: 'number',
					default: 0,
					typeOptions: {
						numberPrecision: 0,
						minValue: 0,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['range'],
						},
					},
				},
				{
					displayName: 'Maximum Selections',
					name: 'maxSelections',
					type: 'number',
					default: 1,
					typeOptions: {
						numberPrecision: 0,
						minValue: 1,
					},
					displayOptions: {
						show: {
							fieldType: ['checkbox'],
							limitSelection: ['range'],
						},
					},
				},
				{
					displayName: 'HTML',
					name: 'html',
					typeOptions: {
						editor: 'htmlEditor',
					},
					type: 'string',
					noDataExpression: true,
					default: placeholder,
					description: 'HTML elements to display on the form page',
					hint: 'Does not accept <code>&lt;script&gt;</code>, <code>&lt;style&gt;</code> or <code>&lt;input&gt;</code> tags',
					displayOptions: {
						show: {
							fieldType: ['html'],
						},
					},
				},
				{
					displayName: 'Multiple Files',
					name: 'multipleFiles',
					type: 'boolean',
					default: true,
					description:
						'Whether to allow the user to select multiple files from the file input or just one',
					displayOptions: {
						show: {
							fieldType: ['file'],
						},
					},
				},
				{
					displayName: 'Accepted File Types',
					name: 'acceptFileTypes',
					type: 'string',
					default: '',
					description: 'Comma-separated list of allowed file extensions',
					hint: 'Leave empty to allow all file types',
					placeholder: 'e.g. .jpg, .png',
					displayOptions: {
						show: {
							fieldType: ['file'],
						},
					},
				},
				{
					displayName: "The displayed date is formatted based on the locale of the user's browser",
					name: 'formatDate',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							fieldType: ['date'],
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
					displayOptions: {
						hide: {
							fieldType: ['html', 'hiddenField'],
						},
					},
				},
			],
		},
	],
};

export const formRespondMode: INodeProperties = {
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
		{
			name: "Using 'Respond to Webhook' Node",
			value: 'responseNode',
			description: "When the 'Respond to Webhook' node is executed",
		},
	],
	default: 'onReceived',
	description: 'When to respond to the form submission',
};

export const formTriggerPanel = {
	header: 'Pull in a test form submission',
	executionsHelp: {
		inactive:
			"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Execute step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
		active:
			"Form Trigger has two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Execute step' button, then fill out the test form that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a form submission via the Production Form URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
	},
	activationHint: {
		active:
			"This node will also trigger automatically on new form submissions (but those executions won't show up here).",
		inactive:
			'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new form submissions created via the Production URL.',
	},
};

export const respondWithOptions: INodeProperties = {
	displayName: 'Form Response',
	name: 'respondWithOptions',
	type: 'fixedCollection',
	placeholder: 'Add option',
	default: { values: { respondWith: 'text' } },
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Respond With',
					name: 'respondWith',
					type: 'options',
					default: 'text',
					options: [
						{
							name: 'Form Submitted Text',
							value: 'text',
							description: 'Show a response text to the user',
						},
						{
							name: 'Redirect URL',
							value: 'redirect',
							description: 'Redirect the user to a URL',
						},
					],
				},
				{
					displayName: 'Text to Show',
					name: 'formSubmittedText',
					description:
						"The text displayed to users after they fill the form. Leave it empty if don't want to show any additional text.",
					type: 'string',
					default: 'Your response has been recorded',
					displayOptions: {
						show: {
							respondWith: ['text'],
						},
					},
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					displayName: 'URL to Redirect to',
					name: 'redirectUrl',
					description:
						'The URL to redirect users to after they fill the form. Must be a valid URL.',
					type: 'string',
					default: '',
					validateType: 'url',
					placeholder: 'e.g. http://www.n8n.io',
					displayOptions: {
						show: {
							respondWith: ['redirect'],
						},
					},
				},
			],
		},
	],
};

export const appendAttributionToForm: INodeProperties = {
	...appendAttributionOption,
	description: 'Whether to include the link “Form automated with n8n” at the bottom of the form',
};
